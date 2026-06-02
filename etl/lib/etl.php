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
