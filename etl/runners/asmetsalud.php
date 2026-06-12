<?php
/**
 * runners/asmetsalud.php
 * ═══════════════════════════════════════════════════════════════════════════
 * ETL ASMETSALUD — Reemplaza 2 scripts originales:
 *
 *   asmet_salud_frecuencias      (contrato 59, planes 659,660)
 *   asmet_salud_resumen_factura  (contrato 59, planes 659,660)
 *
 * Parámetro de rango de fechas: ETL_MESES_ATRAS (definido en .env, default=3)
 * ═══════════════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/etl.php';

const RUNNER = 'ASMETSALUD';

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
    $pg    = conectarSupabase();
} catch (PDOException $e) {
    etlLog("ERROR CRÍTICO de conexión: " . $e->getMessage(), 'ERROR', RUNNER);
    exit(1);
}

$errores = 0;

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 1: FRECUENCIAS
// ═══════════════════════════════════════════════════════════════════════════

$cfgFrecuencias = cargarParamUnico($pg, RUNNER, 'frecuencias');
$contratoFrec   = $cfgFrecuencias['contrato'];
$planesFrec     = sqlIntList($cfgFrecuencias['planesIncluidos']);

etlLog("── {$cfgFrecuencias['label']} (contrato $contratoFrec, planes $planesFrec)", 'INFO', RUNNER);

$queryFrecuencias = "
    SELECT
        e.identifier                                                            AS Ingreso,
        u.documentNumber                                                        AS NoIdentificacion,
        LEFT(p.legalCode, 6)                                                   AS Cup,
        cp.name                                                                 AS [Plan],
        p.name                                                                  AS Producto,
        CAST(bsoapd.quantityBill AS INT)                                        AS Cantidad,
        FORMAT(bs.saleDate, 'MM/yyyy')                                         AS MesAnioVenta
    FROM BillStateOfAccountHeader bsoh
    INNER JOIN encounters           e     ON bsoh.idEncounter     = e.idEncounter
    INNER JOIN BillStateOfAccountProductDetails bsoapd
        ON bsoh.idStateOfAccountHeader = bsoapd.idStateOfAccountHeader
    INNER JOIN BillStateOfAccountContracts bsac ON bsoapd.identifier = bsac.contractNumber
    INNER JOIN products             p     ON bsoapd.idProduct     = p.idProduct
    INNER JOIN contracts            c     ON bsoapd.idContract    = c.idContract
    INNER JOIN contractPlans        cp    ON cp.idPlan = bsoapd.idPlan
        AND c.idContract = cp.idContract
    INNER JOIN billSales            bs    ON bsoapd.idSale        = bs.idSale
    INNER JOIN billSaleDetails      bsd   ON bsoapd.idSaleDetail  = bsd.idSaleDetail
    INNER JOIN users                u     ON u.idUser             = e.idUserPatient
    INNER JOIN userPeople           up    ON u.idUser             = up.idUser
    WHERE
        c.idContract        = $contratoFrec
        AND p.idProductType IN (3, 4)
        AND bs.state        <> 'E'
        AND e.idUserCompany  = 108240
        AND cp.idPlan        IN $planesFrec
        AND e.idStatus       IN (2, 4)
        AND bsoh.status      IN ('AC','FC','FP')
        AND bs.saleDate      >= '$fechaInicio'
        AND bs.saleDate      <= '$fechaFin 23:59:59'
    OPTION (RECOMPILE)
";

$sqlInsert1 = "INSERT INTO asmet_salud_frecuencias
    (ingreso, no_identificacion, cup, plan, producto, cantidad, mes_anio_venta, fecha_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryFrecuencias, 'asmet_salud_frecuencias', $sqlInsert1,
        fn($row) => [
            $row['Ingreso'],      $row['NoIdentificacion'], $row['Cup'],
            $row['Plan'],         $row['Producto'],          $row['Cantidad'],
            $row['MesAnioVenta'], $fechaReporte,
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 2: RESUMEN POR FACTURA
// ═══════════════════════════════════════════════════════════════════════════

$cfgResumen   = cargarParamUnico($pg, RUNNER, 'resumen_factura');
$contratoRes  = $cfgResumen['contrato'];
$planesRes    = sqlIntList($cfgResumen['planesIncluidos']);

etlLog("── {$cfgResumen['label']} (contrato $contratoRes, planes $planesRes)", 'INFO', RUNNER);

$queryResumen = "
    SELECT
        e.identifier                                                            AS Ingreso,
        p.legalCode                                                             AS Cup,
        cp.name                                                                 AS [Plan],
        CONCAT_WS('-', RTRIM(bi.invoicePrefix), bi.invoiceNumber)              AS NumeroFactura,
        FORMAT(bs.saleDate,   'MM/yyyy')                                       AS MesAnioVenta,
        SUM(CAST(bid.quantity AS INT))                                          AS TotalCantidad,
        SUM(CAST(bid.quantity AS INT) * CAST(bid.value AS BIGINT))             AS ValorTotal,
        FORMAT(bi.invoiceDate, 'MM/yyyy')                                      AS MesAnioFactura
    FROM billInvoices bi
    INNER JOIN billInvoiceDetails bid ON bi.idInvoice    = bid.idInvoice
    INNER JOIN billSales          bs  ON bs.idSale       = bid.idSale
    INNER JOIN contracts          cont ON bi.idContract  = cont.idContract
    INNER JOIN contractPlans      cp  ON cp.idPlan = bs.idPlan
        AND cont.idContract = cp.idContract
    INNER JOIN encounters         e   ON bs.idEncounter  = e.idEncounter
    INNER JOIN products           p   ON bid.idProduct   = p.idProduct
    INNER JOIN productTypes       pt  ON p.idProductType = pt.idProductType
    WHERE
        bs.state             <> 'E'
        AND bi.idUserCompany  = 108240
        AND bi.invoiceState   = 'A'
        AND bi.idContract     = $contratoRes
        AND pt.idProductType  IN (3, 4)
        AND cp.idPlan         IN $planesRes
        AND bi.dateBegin      >= '$fechaInicio'
        AND bi.dateBegin      <= '$fechaFin 23:59:59'
    GROUP BY
        bi.invoicePrefix, bi.invoiceNumber,
        bs.saleDate, bi.invoiceDate, bi.dateBegin,
        e.identifier, cp.name, p.legalCode
    OPTION (RECOMPILE)
";

$sqlInsert2 = "INSERT INTO asmet_salud_resumen_factura
    (ingreso, cup, plan, numero_factura, mes_anio_venta, total_cantidad, valor_total, mes_anio_factura, fecha_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryResumen, 'asmet_salud_resumen_factura', $sqlInsert2,
        fn($row) => [
            $row['Ingreso'],       $row['Cup'],             $row['Plan'],
            $row['NumeroFactura'], $row['MesAnioVenta'],    $row['TotalCantidad'],
            $row['ValorTotal'],    $row['MesAnioFactura'],  $fechaReporte,
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ── Resumen final ─────────────────────────────────────────────────────────
etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
if ($errores === 0) {
    etlLog("Proceso completado SIN errores. Fecha: $fechaReporte $horaReporte", 'OK', RUNNER);
} else {
    etlLog("Proceso completado con $errores ERROR(ES). Fecha: $fechaReporte $horaReporte", 'ERROR', RUNNER);
    exit(1);
}
