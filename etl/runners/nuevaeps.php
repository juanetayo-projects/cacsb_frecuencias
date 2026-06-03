<?php
/**
 * runners/nuevaeps.php
 * ═══════════════════════════════════════════════════════════════════════════
 * ETL NUEVA EPS — Reemplaza 2 scripts originales:
 *
 *   neps_frecuencias       (contrato 231 — por fecha de egreso)
 *   neps_frecuencias_venta (contrato 231 — por fecha de venta)
 *
 * Parámetro de rango de fechas: ETL_MESES_ATRAS (definido en .env, default=3)
 * ═══════════════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/etl.php';

const RUNNER = 'NUEVAEPS';

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

$errores = 0;

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 1: FRECUENCIAS POR EGRESO (neps_frecuencias)
// Usa ROW_NUMBER para traer 1 registro por ingreso (la tarifa más alta)
// ═══════════════════════════════════════════════════════════════════════════

etlLog("── Frecuencias por egreso (contrato 231)", 'INFO', RUNNER);

$queryEgreso = "
    WITH BaseData AS (
        SELECT
            e.identifier                                                        AS Ingreso,
            pc.idProductCategory                                                AS IdCategoriaCup,
            bsoah.number                                                        AS NumeroEstadoCuenta,
            bs.saleNumber                                                       AS NumeroVenta,
            CONVERT(VARCHAR, e.dateStart,     23)                              AS FechaIngreso,
            CONVERT(VARCHAR, e.dateDischarge, 23)                              AS FechaEgreso,
            paciente.documentNumber                                             AS NoIdentificacionPaciente,
            CONCAT_WS(' ', paciente.givenName, paciente.familyName)            AS Paciente,
            gpd.name                                                            AS Municipio,
            c.name                                                              AS Contrato,
            COALESCE(cup.alternateCode, p.legalCode)                           AS CUPS,
            CAST(bsoahd.quantity AS INT)                                        AS Cantidad,
            p.name                                                              AS Producto,
            pt.name                                                             AS TipoProducto,
            MONTH(e.dateDischarge)                                              AS Mes,
            YEAR(e.dateDischarge)                                               AS Ano,
            CAST(bplp.value AS NUMERIC)                                         AS ValorUnitario,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(e.idEncounterPartOf, e.idEncounter)
                ORDER BY bplp.value DESC, bs.saleDate DESC
            )                                                                   AS rn
        FROM BillStateOfAccountHeader        bsoah
        INNER JOIN encounters                e
            ON bsoah.idEncounter    = e.idEncounter
            AND e.dateDischarge     >= '$fechaInicio'
            AND e.dateDischarge     <= '$fechaFin 23:59:59'
        INNER JOIN BillStateOfAccountProductDetails bsoahd
            ON bsoah.idStateOfAccountHeader = bsoahd.idStateOfAccountHeader
            AND bsoahd.idUserCompany = 108240
            AND bsoahd.idContract   = 231
        INNER JOIN billSales             bs    ON bsoahd.idSale         = bs.idSale
            AND bs.state <> 'E'
        INNER JOIN billSaleDetails       bsd   ON bsoahd.idSaleDetail   = bsd.idSaleDetail
        INNER JOIN products              p     ON bsoahd.idProduct      = p.idProduct
            AND p.isActive = 1
        INNER JOIN productTypes          pt    ON bsoahd.idProductType  = pt.idProductType
            AND pt.idProductType IN (3, 4)
        INNER JOIN productCategories     pc    ON p.idProductCategory   = pc.idProductCategory
        INNER JOIN contracts             c     ON bsoahd.idContract     = c.idContract
        INNER JOIN users                 paciente ON e.idUserPatient    = paciente.idUser
        INNER JOIN userPeople            up    ON paciente.idUser       = up.idUser
        INNER JOIN generalPoliticalDivisions gpd
            ON up.idHomePlacePoliticalDivision = gpd.idPoliticalDivision
        INNER JOIN billPriceListProducts bplp  ON p.idProduct          = bplp.idProduct
        INNER JOIN billPriceListDates    bpld  ON bplp.idBillPriceListDate = bpld.idBillPriceListDate
        INNER JOIN billPriceLists        bpl   ON bpld.idbillPriceList  = bpl.idbillPriceList
            AND bpl.idbillPriceList = 409
        OUTER APPLY (
            SELECT TOP 1 pacd.alternateCode
            FROM productAlternateCodeDetails pacd
            WHERE pacd.idProduct               = p.idProduct
              AND pacd.idProductAlternateCodes  = 2
              AND pacd.dateEnd                 > GETDATE()
            ORDER BY pacd.dateEnd DESC
        ) cup
        WHERE bsoah.status <> 'AN'
    )
    SELECT * FROM BaseData WHERE rn = 1
    ORDER BY FechaEgreso ASC
    OPTION (RECOMPILE)
";

$sqlInsert1 = "INSERT INTO neps_frecuencias
    (ingreso, fecha_ingreso, fecha_egreso, identificacion, municipio,
     contrato, cup, cantidad, producto, mes, ano,
     valor_unitario, fecha_reporte, hora_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $mysql, $queryEgreso, 'neps_frecuencias', $sqlInsert1,
        fn($row) => [
            $row['Ingreso'],               $row['FechaIngreso'],
            $row['FechaEgreso'],           $row['NoIdentificacionPaciente'],
            $row['Municipio'],             $row['Contrato'],
            $row['CUPS'],                  $row['Cantidad'],
            $row['Producto'],              $row['Mes'],
            $row['Ano'],                   $row['ValorUnitario'],
            $fechaReporte,                 $horaReporte,
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 2: FRECUENCIAS POR VENTA (neps_frecuencias_venta)
// ═══════════════════════════════════════════════════════════════════════════

etlLog("── Frecuencias por venta (contrato 231)", 'INFO', RUNNER);

$queryVenta = "
    WITH BaseData AS (
        SELECT
            e.identifier                                                        AS Ingreso,
            bs.saleNumber                                                       AS NumeroVenta,
            CONVERT(VARCHAR, bs.saleDate, 23)                                  AS FechaVenta,
            paciente.documentNumber                                             AS NoIdentificacionPaciente,
            gpd.name                                                            AS Municipio,
            c.name                                                              AS Contrato,
            LEFT(p.legalCode, 6)                                               AS CUPS,
            (bsd.quantity - ISNULL(bsd.quantityReturned, 0))                   AS Cantidad,
            p.name                                                              AS Producto,
            MONTH(bs.saleDate)                                                  AS Mes,
            YEAR(bs.saleDate)                                                   AS Ano,
            CAST(bplp.value AS NUMERIC(18,2))                                  AS ValorUnitario,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(e.idEncounterPartOf, e.idEncounter)
                ORDER BY bplp.value DESC
            )                                                                   AS rn
        FROM billSales bs WITH (NOLOCK)
        INNER JOIN encounters       e    WITH (NOLOCK) ON bs.idEncounter  = e.idEncounter
        INNER JOIN billSaleDetails  bsd  WITH (NOLOCK) ON bs.idSale       = bsd.idSale
        INNER JOIN products         p    WITH (NOLOCK) ON bsd.idProduct   = p.idProduct
            AND p.isActive = 1
        INNER JOIN productTypes     pt   WITH (NOLOCK) ON p.idProductType = pt.idProductType
            AND pt.idProductType IN (3, 4)
        INNER JOIN contracts        c    WITH (NOLOCK) ON bs.idContract   = c.idContract
        INNER JOIN users            paciente WITH (NOLOCK) ON e.idUserPatient = paciente.idUser
        INNER JOIN userPeople       up   WITH (NOLOCK) ON paciente.idUser  = up.idUser
        INNER JOIN generalPoliticalDivisions gpd WITH (NOLOCK)
            ON up.idHomePlacePoliticalDivision = gpd.idPoliticalDivision
        INNER JOIN billPriceListProducts bplp WITH (NOLOCK) ON p.idProduct = bplp.idProduct
        INNER JOIN billPriceListDates    bpld WITH (NOLOCK)
            ON bplp.idBillPriceListDate = bpld.idBillPriceListDate
        INNER JOIN billPriceLists        bpl  WITH (NOLOCK)
            ON bpld.idbillPriceList = bpl.idbillPriceList
            AND bpl.idbillPriceList = 409
        WHERE
            bs.saleDate      >= '$fechaInicio'
            AND bs.saleDate  <= '$fechaFin 23:59:59'
            AND bs.idContract = 231
            AND bs.idUserCompany = 108240
            AND bs.state     <> 'E'
    )
    SELECT
        Ingreso, NumeroVenta, FechaVenta, NoIdentificacionPaciente,
        Municipio, Contrato, CUPS, Cantidad, Producto,
        Mes, Ano, ValorUnitario
    FROM BaseData WHERE rn = 1
    ORDER BY FechaVenta ASC
    OPTION (RECOMPILE)
";

$sqlInsert2 = "INSERT INTO neps_frecuencias_venta
    (ingreso, fecha_venta, identificacion, municipio, contrato, cup,
     cantidad, producto, mes, ano, valor_unitario, fecha_reporte, hora_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $mysql, $queryVenta, 'neps_frecuencias_venta', $sqlInsert2,
        fn($row) => [
            $row['Ingreso'],               $row['FechaVenta'],
            $row['NoIdentificacionPaciente'], $row['Municipio'],
            $row['Contrato'],              $row['CUPS'],
            $row['Cantidad'],              $row['Producto'],
            $row['Mes'],                   $row['Ano'],
            $row['ValorUnitario'],
            $fechaReporte,                 $horaReporte,
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
