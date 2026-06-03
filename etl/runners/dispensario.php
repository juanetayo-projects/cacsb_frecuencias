<?php
/**
 * runners/dispensario.php
 * ═══════════════════════════════════════════════════════════════════════════
 * ETL DISPENSARIO MÉDICO — 1 script original:
 *
 *   dispensario_medico_frecuencias (contrato 198)
 *
 * Parámetro de rango de fechas: ETL_MESES_ATRAS (definido en .env, default=3)
 * NOTA: El script original usaba fecha fija '2026-01-01'. Ahora usa el
 * parámetro unificado ETL_MESES_ATRAS para consistencia con los demás runners.
 * ═══════════════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/etl.php';

const RUNNER = 'DISPENSARIO';

etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
etlLog("Inicio del proceso ETL", 'INFO', RUNNER);

$f = etlFechas();
$fechaInicio  = $f['inicio'];
$fechaFin     = $f['fin'];
$fechaReporte = date('Y-m-d');
$horaReporte  = date('H:i:s');

etlLog("Rango de fechas: $fechaInicio → $fechaFin", 'INFO', RUNNER);

try {
    $mssql = conectarMSSQL();
    $mysql = conectarMySQL();
} catch (PDOException $e) {
    etlLog("ERROR CRÍTICO de conexión: " . $e->getMessage(), 'ERROR', RUNNER);
    exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPENSARIO MÉDICO — Frecuencias con paginación nativa MSSQL (OFFSET/FETCH)
// El script original usaba paginación PHP. Aquí la hacemos en MSSQL directamente
// con un único query y streaming, eliminando el loop do-while.
// ═══════════════════════════════════════════════════════════════════════════

etlLog("── Dispensario médico (contrato 198)", 'INFO', RUNNER);

$query = "
    SELECT
        e.identifier                                                            AS Ingreso,
        CONVERT(VARCHAR, e.dateStart,     23)                                  AS FechaIngreso,
        CONVERT(VARCHAR, e.dateDischarge, 23)                                  AS FechaEgreso,
        bs.saleNumber                                                           AS NumeroVenta,
        CASE
            WHEN bs.state = 'A' THEN 'Activa'
            WHEN bs.state = 'F' THEN 'Facturada'
            WHEN bs.state = 'P' THEN 'Pendiente'
            ELSE bs.state
        END                                                                     AS EstadoVenta,
        LEFT(p.legalCode, 6)                                                   AS Cup,
        CAST((bsd.quantity - bsd.quantityReturned) AS INT)                    AS Cantidad,
        (CAST((bsd.quantity - bsd.quantityReturned) AS INT) * bsd.value)       AS ValorTotal,
        bsd.value                                                               AS ValorUnitario,
        p.name                                                                  AS Producto,
        pt.name                                                                 AS TipoProducto,
        FORMAT(MONTH(bs.saleDate), '00')                                       AS Mes,
        YEAR(bs.saleDate)                                                       AS Anio
    FROM billSaleDetails  bsd
    INNER JOIN billSales  bs  ON bs.idSale    = bsd.idSale
    INNER JOIN encounters e   ON e.idEncounter = bs.idEncounter
    INNER JOIN contracts  c   ON c.idContract  = bs.idContract
    INNER JOIN products   p   ON p.idProduct   = bsd.idProduct
    INNER JOIN productTypes pt ON pt.idProductType = p.idProductType
    WHERE
        bs.saleDate  >= '$fechaInicio'
        AND bs.saleDate <= '$fechaFin 23:59:59'
        AND bs.state  <> 'E'
        AND c.idContract = 198
    ORDER BY e.identifier
    OPTION (RECOMPILE)
";

$sqlInsert = "INSERT INTO dispensario_medico_frecuencias
    (ingreso, fecha_ingreso, fecha_egreso, numero_venta, estado_venta,
     cup, cantidad, valor_total, valor_unitario, producto, tipo_producto,
     mes, anio, fecha_reporte, hora_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    $insertados = etlTransferir($mssql, $mysql, $query, 'dispensario_medico_frecuencias', $sqlInsert,
        fn($row) => [
            $row['Ingreso'],       $row['FechaIngreso'],  $row['FechaEgreso'],
            $row['NumeroVenta'],   $row['EstadoVenta'],   $row['Cup'],
            $row['Cantidad'],      $row['ValorTotal'],    $row['ValorUnitario'],
            $row['Producto'],      $row['TipoProducto'],  $row['Mes'],
            $row['Anio'],
            $fechaReporte,         $horaReporte,
        ],
        RUNNER
    );
    etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
    etlLog("Proceso completado SIN errores. Fecha: $fechaReporte $horaReporte", 'OK', RUNNER);
} catch (Throwable $e) {
    etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
    etlLog("Proceso completado con ERRORES. Fecha: $fechaReporte $horaReporte", 'ERROR', RUNNER);
    exit(1);
}
