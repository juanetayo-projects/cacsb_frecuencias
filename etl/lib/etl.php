<?php
/**
 * lib/etl.php — Motor ETL genérico + utilidades
 * Origen: Azure SQL Server → Destino: Supabase PostgreSQL
 */
declare(strict_types=1);

function etlLog(string $mensaje, string $nivel = 'INFO', string $runner = ''): void
{
    $niveles = ['ERROR' => 0, 'WARN' => 1, 'INFO' => 1, 'OK' => 1, 'DEBUG' => 2];
    if (($niveles[$nivel] ?? 1) > ETL_LOG_LEVEL) return;
    $ts   = date('Y-m-d H:i:s');
    $pref = $runner ? "[$runner]" : '';
    echo "[$ts][$nivel]$pref $mensaje" . PHP_EOL;
}

/**
 * Rango de fechas ETL:
 *   Inicio: día 1 del mes N meses atrás
 *   Fin:    ayer (día anterior al día actual — corte operacional)
 */
function etlFechas(): array
{
    $meses   = ETL_MESES_ATRAS;
    $inicio  = date('Y-m-01', strtotime("-{$meses} months"));
    $fin     = date('Y-m-d', strtotime('yesterday')); // corte día anterior
    return ['inicio' => $inicio, 'fin' => $fin];
}

/**
 * Motor ETL: Azure SQL → Supabase PostgreSQL
 * Usa TRUNCATE ... RESTART IDENTITY (más eficiente que DELETE en PostgreSQL)
 */
function etlTransferir(
    PDO      $mssql,
    PDO      $pg,
    string   $query,
    string   $tabla,
    string   $sqlInsert,
    callable $mapeador,
    string   $runner = ''
): int {
    $inicio = microtime(true);
    etlLog("Iniciando → $tabla", 'INFO', $runner);

    // 1. Ejecutar query en Azure SQL
    try {
        $stmt = $mssql->query($query);
    } catch (PDOException $e) {
        etlLog("ERROR query MSSQL: " . $e->getMessage(), 'ERROR', $runner);
        throw $e;
    }

    // 2. Transacción en Supabase
    $pg->beginTransaction();
    try {
        // TRUNCATE + RESTART IDENTITY para resetear secuencias
        $pg->exec("TRUNCATE TABLE \"$tabla\" RESTART IDENTITY");

        $stmtIns  = $pg->prepare($sqlInsert);
        $contador = 0;
        $lote     = 0;

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $stmtIns->execute($mapeador($row));
            $contador++;
            $lote++;

            if ($lote >= ETL_BATCH_SIZE) {
                $pg->commit();
                $pg->beginTransaction();
                $lote = 0;
                gc_collect_cycles();
            }
        }

        $pg->commit();
        $seg = round(microtime(true) - $inicio, 2);
        etlLog("OK — $contador registros en '$tabla' ({$seg}s)", 'OK', $runner);
        return $contador;

    } catch (Throwable $e) {
        if ($pg->inTransaction()) $pg->rollBack();
        etlLog("ERROR en ETL '$tabla': " . $e->getMessage(), 'ERROR', $runner);
        throw $e;
    }
}

/**
 * Carga la configuración de un bloque (runner + bloque) desde report_params.
 * Devuelve un array de filas con las claves: variante, label, tabla, contrato,
 * y opcionalmente legalCodes (cadena "('cod1','cod2',...)") cuando el bloque
 * tiene asociada una categoría de cat_cups.
 */
function cargarConfigBloque(PDO $pg, string $runner, string $bloque): array
{
    $stmt = $pg->prepare(
        "SELECT variante, label, tabla_destino, id_contrato, legal_codes_categoria
         FROM report_params
         WHERE runner = ? AND bloque = ? AND activo = TRUE
         ORDER BY orden"
    );
    $stmt->execute([$runner, $bloque]);

    $filas = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $cfg = [
            'variante' => $row['variante'],
            'label'    => $row['label'],
            'tabla'    => $row['tabla_destino'],
            'contrato' => (int)$row['id_contrato'],
        ];
        if (!empty($row['legal_codes_categoria'])) {
            $cfg['legalCodes'] = cargarLegalCodes($pg, $row['legal_codes_categoria']);
        }
        $filas[] = $cfg;
    }
    return $filas;
}

/**
 * Carga la fila única de configuración de un bloque (runner + bloque + variante)
 * desde report_params. Para bloques sin variantes (variante='default').
 */
function cargarParamUnico(PDO $pg, string $runner, string $bloque, string $variante = 'default'): array
{
    $stmt = $pg->prepare(
        "SELECT * FROM report_params
         WHERE runner = ? AND bloque = ? AND variante = ? AND activo = TRUE"
    );
    $stmt->execute([$runner, $bloque, $variante]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new RuntimeException("report_params no encontrado: $runner/$bloque/$variante");
    }

    $cfg = [
        'tabla'           => $row['tabla_destino'],
        'label'           => $row['label'],
        'contrato'        => $row['id_contrato']     !== null ? (int)$row['id_contrato']     : null,
        'billPriceList'   => $row['bill_price_list'] !== null ? (int)$row['bill_price_list'] : null,
        'contratos'       => pgArrayInt($row['id_contratos']),
        'planesExcluidos' => pgArrayInt($row['id_planes_excluidos']),
        'planesIncluidos' => pgArrayInt($row['id_planes_incluidos']),
        'productTypes'    => pgArrayInt($row['id_product_types']),
    ];
    if (!empty($row['legal_codes_categoria'])) {
        $cfg['legalCodes'] = cargarLegalCodes($pg, $row['legal_codes_categoria']);
    }
    return $cfg;
}

/**
 * Convierte un array de Postgres ("{1,2,3}") en array PHP de enteros
 */
function pgArrayInt(?string $valor): array
{
    if ($valor === null || $valor === '{}') return [];
    return array_map('intval', explode(',', trim($valor, '{}')));
}

/**
 * Convierte un array PHP de enteros en lista SQL "(1,2,3)"
 */
function sqlIntList(array $valores): string
{
    return '(' . implode(',', array_map('intval', $valores)) . ')';
}

/**
 * Devuelve los CUPS de una categoría de cat_cups como cadena SQL "('a','b',...)"
 */
function cargarLegalCodes(PDO $pg, string $categoria): string
{
    $stmt = $pg->prepare("SELECT cup FROM cat_cups WHERE categoria = ? ORDER BY id");
    $stmt->execute([$categoria]);
    $cups = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $quoted = array_map(fn($c) => "'" . str_replace("'", "''", $c) . "'", $cups);
    return '(' . implode(',', $quoted) . ')';
}

/**
 * Registra el inicio de una ejecución en log_cronjob de Supabase
 */
function logInicioEjecucion(PDO $pg, string $runner): int
{
    $stmt = $pg->prepare(
        "INSERT INTO log_cronjob (runner, fecha_inicio, estado) VALUES (?, NOW(), 'RUNNING') RETURNING id"
    );
    $stmt->execute([$runner]);
    return (int)$stmt->fetchColumn();
}

/**
 * Actualiza el registro de log_cronjob al finalizar
 */
function logFinEjecucion(PDO $pg, int $logId, string $estado, int $registros, ?string $error = null): void
{
    $pg->prepare(
        "UPDATE log_cronjob SET
            fecha_fin = NOW(),
            duracion_seg = EXTRACT(EPOCH FROM (NOW() - fecha_inicio)),
            registros_insertados = ?,
            estado = ?,
            mensaje_error = ?
         WHERE id = ?"
    )->execute([$registros, $estado, $error, $logId]);
}
