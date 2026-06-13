<?php
/**
 * runners/sura.php
 * ═══════════════════════════════════════════════════════════════════════════
 * ETL SURA — Reemplaza 8 scripts originales:
 *
 *   sura_evento_cont        (contrato 39)  → tabla sura_evento_cont
 *   sura_evento_sub         (contrato 66)  → tabla sura_evento_sub
 *   sura_frecuencias        (contratos 63,172, exc. planes 443,360,317,116)
 *   sura_internaciones      (contrato 172)
 *   sura_ventas             (contratos 63,172, exc. planes)
 *   sura_pgp_ejecucion      (contrato 218)
 *   sura_cups_principal     (contratos 63,172, exc. planes)
 *   sura_inter_sinprioridad (contrato 172)
 *
 * Parámetro de rango de fechas: ETL_MESES_ATRAS (definido en .env, default=3)
 * ═══════════════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/etl.php';

const RUNNER = 'SURA';

etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
etlLog("Inicio del proceso ETL", 'INFO', RUNNER);

// ── Rango de fechas unificado (parámetro) ─────────────────────────────────
$f = etlFechas();
$fechaInicio = $f['inicio'];
$fechaFin    = $f['fin'];

etlLog("Rango de fechas: $fechaInicio → $fechaFin (ETL_MESES_ATRAS=" . ETL_MESES_ATRAS . ")", 'INFO', RUNNER);

// ── Conexiones ────────────────────────────────────────────────────────────
try {
    $mssql = conectarMSSQL();
    $pg    = conectarSupabase();
} catch (PDOException $e) {
    etlLog("ERROR CRÍTICO de conexión: " . $e->getMessage(), 'ERROR', RUNNER);
    exit(1);
}

$fechaReporte = date('Y-m-d');
$horaReporte  = date('H:i:s');
$errores      = 0;

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 1: EVENTO (2 contratos: contributivo 39 / subsidiado 66)
// ═══════════════════════════════════════════════════════════════════════════

$configEvento = cargarConfigBloque($pg, RUNNER, 'evento');

foreach ($configEvento as $cfg) {
    $idContrato = $cfg['contrato'];
    $tabla      = $cfg['tabla'];
    $label      = $cfg['label'];

    etlLog("── $label (contrato $idContrato)", 'INFO', RUNNER);

    $query = "
        SELECT
            e.identifier                                                        AS Ingreso,
            OUTER_LOC.name                                                      AS UltimaUbicacion,
            p.name                                                              AS Producto,
            pt.name                                                             AS TipoProducto,
            IIF(p.legalCode IN ('00P0000511','00P0000512'),
                LEFT(p.legalCode, 8),
                LEFT(p.legalCode, 6))                                          AS Cup,
            CAST(bid.quantity AS BIGINT)                                        AS Cantidad,
            CAST(bid.value AS DECIMAL(18,2))                                   AS ValorUnitario,
            FORMAT(bi.invoiceDate, 'MM/yyyy')                                  AS MesAnioFactura
        FROM billInvoices bi
        INNER JOIN billInvoiceDetails bid ON bi.idInvoice = bid.idInvoice
        INNER JOIN BillStateOfAccountProductDetails bsapd
            ON bid.idSaleDetail = bsapd.idSaleDetail
        INNER JOIN billSales    bs   ON bs.idSale    = bsapd.idSale
        INNER JOIN billSaleDetails bsd ON bsapd.idSaleDetail = bsd.idSaleDetail
        INNER JOIN contracts    cont ON bsapd.idContract = cont.idContract
        INNER JOIN encounters   e    ON bs.idEncounter   = e.idEncounter
        INNER JOIN products     p    ON bid.idProduct    = p.idProduct
        INNER JOIN productTypes pt   ON p.idProductType  = pt.idProductType
        OUTER APPLY (
            SELECT TOP 1 pc.name
            FROM encounterRecords er
            INNER JOIN physicalLocations pc ON pc.idPhysicalLocation = er.idActualLocation
            WHERE er.idEncounter = e.idEncounter
            ORDER BY er.idEncounter DESC
        ) AS OUTER_LOC
        WHERE
            bs.state            <> 'E'
            AND bi.idUserCompany = 108240
            AND bi.invoiceState  = 'A'
            AND cont.idContract  = $idContrato
            AND bi.invoiceDate   >= '$fechaInicio'
            AND bi.invoiceDate   <= '$fechaFin 23:59:59'
        OPTION (RECOMPILE)
    ";

    $sqlInsert = "INSERT INTO \"$tabla\"
        (ingreso, ultima_ubicacion, producto, tipo_producto, cup,
         cantidad, valor_unitario, mes_anio_factura, fecha_reporte)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    try {
        etlTransferir($mssql, $pg, $query, $tabla, $sqlInsert,
            fn($row) => [
                $row['Ingreso'],       $row['UltimaUbicacion'], $row['Producto'],
                $row['TipoProducto'],  $row['Cup'],             $row['Cantidad'],
                $row['ValorUnitario'], $row['MesAnioFactura'],
                $fechaReporte,
            ],
            RUNNER
        );
    } catch (Throwable $e) {
        $errores++;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 2: FRECUENCIAS (contratos 63 y 172, excl. planes 443,360,317,116)
// ═══════════════════════════════════════════════════════════════════════════

$cfgFrecuencias = cargarParamUnico($pg, RUNNER, 'frecuencias');
$contratosFrec  = sqlIntList($cfgFrecuencias['contratos']);
$exclPlanesFrec = sqlIntList($cfgFrecuencias['planesExcluidos']);

etlLog("── {$cfgFrecuencias['label']} (contratos {$contratosFrec})", 'INFO', RUNNER);

$queryFrecuencias = "
    SELECT
        INGRESO.identifier                                                      AS INGRESO,
        CONVERT(VARCHAR, INGRESO.dateStart,     23)                            AS [FECHA DE INGRESO],
        CONVERT(VARCHAR, INGRESO.dateDischarge, 23)                            AS [FECHA DE EGRESO],
        PACIENTE.documentNumber                                                 AS [DOCUMENTO DEL PACIENTE],
        PACIENTE.givenName                                                      AS [NOMBRES DEL PACIENTE],
        PACIENTE.familyName                                                     AS [APELLIDOS DEL PACIENTE],
        CASE
            WHEN CONT.name LIKE '%EMSSANAR%' OR PLANES.name LIKE '%EMSSANAR%'   THEN 'EMSSANAR'
            WHEN CONT.name LIKE '%NUEVA%'    OR PLANES.name LIKE '%NUEVA%'      THEN 'NUEVA EPS'
            WHEN CONT.name LIKE '%NEPS%'     OR PLANES.name LIKE '%NEPS%'       THEN 'NUEVA EPS'
            WHEN CONT.name LIKE '%COMFENALCO%' OR PLANES.name LIKE '%COMFENALCO%' THEN 'COMFENALCO'
            WHEN CONT.name LIKE '%SURA%'     OR PLANES.name LIKE '%SURA%'       THEN 'SURA'
            ELSE CONT.name
        END                                                                     AS ASEGURADORA,
        CONT.name                                                               AS CONTRATO,
        PLANES.name                                                             AS [PLAN],
        BS.saleNumber                                                           AS [NUMERO DE VENTA],
        CONVERT(VARCHAR, BS.saleDate, 23)                                      AS [FECHA DE LA VENTA],
        CONCAT(U.givenName, ' ', U.familyName)                                 AS [RESPONSABLE DE LA VENTA],
        CASE
            WHEN BS.state = 'A' THEN 'ACTIVA'
            WHEN BS.state = 'E' THEN 'ELIMINADA'
            WHEN BS.state = 'F' THEN 'FACTURADA'
        END                                                                     AS [ESTADO DE VENTA],
        LOC_HIST.name                                                           AS [ULTIMA UBICACION DEL PACIENTE],
        LEFT(PROD.legalCode, 6)                                                AS CUPS,
        CAST(BSOAPD.quantityBill AS INT)                                        AS CANTIDAD,
        PROD.name                                                               AS PRODUCTO,
        PT.name                                                                 AS [TIPO DE PRODUCTO],
        CASE WHEN BS.state = 'A' THEN 'NO' WHEN BS.state = 'F' THEN 'SI' END  AS RIPS,
        MONTH(INGRESO.dateDischarge)                                            AS MES,
        YEAR(INGRESO.dateDischarge)                                             AS [ANO],
        CASE WHEN BS.state = 'A'
             THEN DATEDIFF(DAY, INGRESO.dateDischarge, GETDATE())
             ELSE 0
        END                                                                     AS [DIAS ACTIVO],
        CAST(BSD.valueNet AS NUMERIC)                                           AS VALOR
    FROM BillStateOfAccountHeader BSOAH
    INNER JOIN encounters INGRESO ON BSOAH.idEncounter = INGRESO.idEncounter
        AND INGRESO.dateDischarge IS NOT NULL
    INNER JOIN BillStateOfAccountProductDetails BSOAPD
        ON BSOAH.idStateOfAccountHeader = BSOAPD.idStateOfAccountHeader
    INNER JOIN billSales BS ON BSOAPD.idSale = BS.idSale
    INNER JOIN billSaleDetails BSD ON BSOAPD.idSaleDetail = BSD.idSaleDetail
    INNER JOIN products PROD ON BSOAPD.idProduct = PROD.idProduct
    INNER JOIN productTypes PT ON BSOAPD.idProductType = PT.idProductType
    INNER JOIN users COMPANY ON BSOAPD.idUserCompany = COMPANY.idUser
    INNER JOIN contracts CONT ON BSOAPD.idContract = CONT.idContract
    INNER JOIN contractPlans PLANES ON BSOAPD.idPlan = PLANES.idPlan
    INNER JOIN users U ON BS.idUserRecord = U.idUser
    INNER JOIN users PACIENTE ON INGRESO.idUserPatient = PACIENTE.idUser
    OUTER APPLY (
        SELECT TOP 1 PL.name
        FROM encounterHistoricalRecords EHR
        INNER JOIN physicalLocations PL ON EHR.idLocation = PL.idPhysicalLocation
        WHERE BS.idEncounter = EHR.idEncounter
        ORDER BY EHR.idRecord DESC
    ) AS LOC_HIST
    WHERE
        BSOAPD.idContract IN $contratosFrec
        AND BSOAPD.idPlan  NOT IN $exclPlanesFrec
        AND PT.idProductType IN (3, 4)
        AND BS.state <> 'E'
        AND INGRESO.dateDischarge >= '$fechaInicio'
        AND INGRESO.dateDischarge <= '$fechaFin 23:59:59'
    OPTION (RECOMPILE)
";

$sqlInsertFrecuencias = "INSERT INTO sura_frecuencias
    (ingreso, fecha_ingreso, fecha_egreso, documento, nombres, apellidos,
     aseguradora, contrato, plan, venta, fecha_venta, responsable_venta,
     estado, ubicacion, cup, cantidad, descripcion, tipo_producto,
     rips, year, mes, activo, valor, fecha_reporte, hora_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryFrecuencias, 'sura_frecuencias', $sqlInsertFrecuencias,
        fn($row) => [
            $row['INGRESO'],                     $row['FECHA DE INGRESO'],
            $row['FECHA DE EGRESO'],             $row['DOCUMENTO DEL PACIENTE'],
            $row['NOMBRES DEL PACIENTE'],        $row['APELLIDOS DEL PACIENTE'],
            $row['ASEGURADORA'],                 $row['CONTRATO'],
            $row['PLAN'],                        $row['NUMERO DE VENTA'],
            $row['FECHA DE LA VENTA'],           $row['RESPONSABLE DE LA VENTA'],
            $row['ESTADO DE VENTA'],             $row['ULTIMA UBICACION DEL PACIENTE'],
            $row['CUPS'],                        $row['CANTIDAD'],
            $row['PRODUCTO'],                    $row['TIPO DE PRODUCTO'],
            $row['RIPS'],                        $row['ANO'],
            $row['MES'],                         $row['DIAS ACTIVO'],
            $row['VALOR'],
            $fechaReporte,                       $horaReporte,
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 3: INTERNACIONES (contrato 172)
// ═══════════════════════════════════════════════════════════════════════════

$cfgInternaciones = cargarParamUnico($pg, RUNNER, 'internaciones');
$contratoInter    = $cfgInternaciones['contrato'];
$legalCodesInter  = $cfgInternaciones['legalCodes'];

etlLog("── {$cfgInternaciones['label']} (contrato $contratoInter)", 'INFO', RUNNER);

$queryInternaciones = "
    SELECT
        INGRESO.identifier                                                      AS INGRESO,
        CONVERT(VARCHAR, INGRESO.dateStart,     23)                            AS [FECHA DE INGRESO],
        CONVERT(VARCHAR, INGRESO.dateDischarge, 23)                            AS [FECHA DE EGRESO],
        CASE
            WHEN CONT.name LIKE '%SURA%' OR PLANES.name LIKE '%SURA%' THEN 'SURA'
            ELSE CONT.name
        END                                                                     AS ASEGURADORA,
        CONT.name                                                               AS CONTRATO,
        PLANES.name                                                             AS [PLAN],
        PACIENTE.documentNumber                                                 AS DOCUMENTO,
        -- Cup principal: busca el primer código de internación conocido del ingreso
        COALESCE(
            (SELECT TOP 1 P2.legalCode
             FROM BillStateOfAccountHeader BSOAH2
             INNER JOIN BillStateOfAccountProductDetails BSOAPD2
                 ON BSOAH2.idStateOfAccountHeader = BSOAPD2.idStateOfAccountHeader
             INNER JOIN products P2 ON BSOAPD2.idProduct = P2.idProduct
             WHERE BSOAPD2.idSale = bs.idSale
               AND P2.legalCode IN $legalCodesInter
             ORDER BY BSOAPD2.idSaleDetail),
            P.legalCode
        )                                                                       AS CUPS,
        MONTH(INGRESO.dateDischarge)                                            AS MES,
        YEAR(INGRESO.dateDischarge)                                             AS [YEAR]
    FROM billSales AS bs
    INNER JOIN encounters      AS INGRESO ON bs.idEncounter      = INGRESO.idEncounter
    INNER JOIN encounterRecords ER         ON INGRESO.idEncounter = ER.idEncounter
    INNER JOIN users            PACIENTE   ON INGRESO.idUserPatient = PACIENTE.idUser
    INNER JOIN contracts        AS CONT    ON bs.idContract       = CONT.idContract
    INNER JOIN contractPlans    AS PLANES  ON bs.idPlan = PLANES.idPlan
        AND CONT.idContract = PLANES.idContract
    INNER JOIN billSaleDetails  AS bsd     ON bs.idSale = bsd.idSale
    INNER JOIN BillStateOfAccountProductDetails AS bsapd
        ON bsd.idSaleDetail = bsapd.idSaleDetail
    INNER JOIN BillStateOfAccountContracts AS bsac
        ON bsapd.identifier = bsac.contractNumber
    INNER JOIN BillStateOfAccountHeader    AS bsah
        ON bsah.idStateOfAccountHeader = bsapd.idStateOfAccountHeader
    INNER JOIN products P ON bsapd.idProduct = P.idProduct
    WHERE
        INGRESO.idUserCompany   <> 1
        AND bsac.idContract      = $contratoInter
        AND INGRESO.idEncounter  = bsah.idEncounter
        AND P.legalCode          IN $legalCodesInter
        AND INGRESO.dateDischarge >= '$fechaInicio'
        AND INGRESO.dateDischarge <= '$fechaFin 23:59:59'
    OPTION (RECOMPILE)
";

$sqlInsertInter = "INSERT INTO sura_internaciones
    (ingreso, fecha_ingreso, fecha_egreso, aseguradora, contrato, plan, documento, cup, mes, year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryInternaciones, 'sura_internaciones', $sqlInsertInter,
        fn($row) => [
            $row['INGRESO'],     $row['FECHA DE INGRESO'], $row['FECHA DE EGRESO'],
            $row['ASEGURADORA'], $row['CONTRATO'],          $row['PLAN'],
            $row['DOCUMENTO'],   $row['CUPS'],
            $row['MES'],         $row['YEAR'],
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 4: VENTAS — Resumen por mes (contratos 63, 172, excl. planes)
// ═══════════════════════════════════════════════════════════════════════════

$cfgVentas      = cargarParamUnico($pg, RUNNER, 'ventas');
$contratosVent  = sqlIntList($cfgVentas['contratos']);
$exclPlanesVent = sqlIntList($cfgVentas['planesExcluidos']);

etlLog("── {$cfgVentas['label']} (contratos {$contratosVent})", 'INFO', RUNNER);

$queryVentas = "
    SELECT
        [Facturada], [Pendiente], [Eliminada], [EstadoCuenta], Mes
    FROM (
        SELECT
            bsd.idSaleDetail AS NumeroVenta,
            CASE
                WHEN DATENAME(MONTH, e.dateDischarge) = 'January'   THEN 'Enero'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'February'  THEN 'Febrero'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'March'     THEN 'Marzo'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'April'     THEN 'Abril'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'May'       THEN 'Mayo'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'June'      THEN 'Junio'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'July'      THEN 'Julio'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'August'    THEN 'Agosto'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'September' THEN 'Septiembre'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'October'   THEN 'Octubre'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'November'  THEN 'Noviembre'
                WHEN DATENAME(MONTH, e.dateDischarge) = 'December'  THEN 'Diciembre'
            END AS Mes,
            CASE
                WHEN bs.state = 'F'                                      THEN 'Facturada'
                WHEN bs.state = 'E'                                      THEN 'Eliminada'
                WHEN bs.state IN ('P','A')
                     AND bsd.idSaleDetail NOT IN (
                         SELECT bsapd.idSaleDetail
                         FROM BillStateOfAccountProductDetails bsapd
                     )                                                   THEN 'Pendiente'
                WHEN bs.state NOT IN ('F','E')
                     AND bsd.idSaleDetail IN (
                         SELECT bsapdf.idSaleDetail
                         FROM BillStateOfAccountProductDetails bsapdf
                         WHERE bsapdf.idContract IN $contratosVent
                           AND bsapdf.idPlan NOT IN $exclPlanesVent
                     )                                                   THEN 'EstadoCuenta'
            END AS EstadoVenta
        FROM billSales bs
        INNER JOIN encounters     e   ON e.idEncounter = bs.idEncounter
        LEFT  JOIN contracts      c   ON bs.idContract = c.idContract
        INNER JOIN billSaleDetails bsd ON bs.idSale = bsd.idSale
        INNER JOIN products       p   ON bsd.idProduct = p.idProduct
        INNER JOIN productTypes   pt  ON p.idProductType = pt.idProductType
        WHERE
            p.idProductType IN (3, 4)
            AND bs.idContract IN $contratosVent
            AND bs.idPlan NOT IN $exclPlanesVent
            AND e.dateDischarge >= '$fechaInicio'
            AND e.dateDischarge <= '$fechaFin 23:59:59'
    ) AS base
    PIVOT (
        COUNT(NumeroVenta)
        FOR EstadoVenta IN ([Facturada],[Pendiente],[Eliminada],[EstadoCuenta])
    ) AS pvt
    OPTION (RECOMPILE)
";

$sqlInsertVentas = "INSERT INTO sura_ventas (facturada, pendiente, eliminada, estado_cuenta, mes)
    VALUES (?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryVentas, 'sura_ventas', $sqlInsertVentas,
        fn($row) => [
            $row['Facturada'] ?? 0, $row['Pendiente'] ?? 0,
            $row['Eliminada'] ?? 0, $row['EstadoCuenta'] ?? 0,
            $row['Mes'],
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 5: PGP — Ejecución (contrato 218)
// ═══════════════════════════════════════════════════════════════════════════

$cfgPgp     = cargarParamUnico($pg, RUNNER, 'pgp_ejecucion');
$contratoPgp = $cfgPgp['contrato'];

etlLog("── {$cfgPgp['label']} (contrato $contratoPgp)", 'INFO', RUNNER);

$queryPgp = "
    SELECT
        e.identifier                                                            AS Ingreso,
        u.documentNumber                                                        AS NoIdentificacion,
        LEFT(p.legalCode, 6)                                                   AS Cup,
        cp.name                                                                 AS [Plan],
        CAST((bsd.quantity - bsd.quantityReturned) AS INT)                    AS Cantidad,
        bsd.value                                                               AS ValorUnitario,
        (CAST((bsd.quantity - bsd.quantityReturned) AS INT) * bsd.value)       AS ValorTotal,
        p.name                                                                  AS Producto,
        FORMAT(bs.saleDate, 'MM/yyyy')                                         AS MesAnioVenta
    FROM BillStateOfAccountHeader bsoh
    INNER JOIN encounters           e     ON bsoh.idEncounter     = e.idEncounter
    INNER JOIN users                u     ON u.idUser             = e.idUserPatient
    INNER JOIN BillStateOfAccountProductDetails bsoapd
        ON bsoh.idStateOfAccountHeader = bsoapd.idStateOfAccountHeader
    INNER JOIN BillStateOfAccountContracts bsac ON bsoapd.identifier = bsac.contractNumber
    INNER JOIN products             p     ON bsoapd.idProduct     = p.idProduct
    INNER JOIN contracts            c     ON bsoapd.idContract    = c.idContract
    INNER JOIN contractPlans        cp    ON cp.idPlan = bsoapd.idPlan
        AND c.idContract = cp.idContract
    INNER JOIN billSales            bs    ON bsoapd.idSale        = bs.idSale
    INNER JOIN billSaleDetails      bsd   ON bsoapd.idSaleDetail  = bsd.idSaleDetail
    WHERE
        bs.state    <> 'E'
        AND c.idContract = $contratoPgp
        AND e.idUserCompany = 108240
        AND e.idStatus = 4
        AND e.dateDischarge >= '$fechaInicio'
        AND e.dateDischarge <= '$fechaFin 23:59:59'
    OPTION (RECOMPILE)
";

$sqlInsertPgp = "INSERT INTO sura_pgp_ejecucion
    (ingreso, no_identificacion, cup, plan, cantidad, valor_unitario, valor_total, producto, mes_anio_venta, fecha_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryPgp, 'sura_pgp_ejecucion', $sqlInsertPgp,
        fn($row) => [
            $row['Ingreso'],      $row['NoIdentificacion'], $row['Cup'],
            $row['Plan'],         $row['Cantidad'],          $row['ValorUnitario'],
            $row['ValorTotal'],   $row['Producto'],          $row['MesAnioVenta'],
            $fechaReporte,
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 6: CUP PRINCIPAL (contratos 63,172, solo productType=3)
// ═══════════════════════════════════════════════════════════════════════════

$cfgCupPrincipal     = cargarParamUnico($pg, RUNNER, 'cups_principal');
$contratosCup        = sqlIntList($cfgCupPrincipal['contratos']);
$exclPlanesCup       = sqlIntList($cfgCupPrincipal['planesExcluidos']);
$productTypesCup     = sqlIntList($cfgCupPrincipal['productTypes']);

etlLog("── {$cfgCupPrincipal['label']} (contratos {$contratosCup})", 'INFO', RUNNER);

$queryCupPrincipal = "
    SELECT
        INGRESO.identifier                                                      AS INGRESO,
        CONVERT(VARCHAR, INGRESO.dateStart,     23)                            AS [FECHA DE INGRESO],
        CONVERT(VARCHAR, INGRESO.dateDischarge, 23)                            AS [FECHA DE EGRESO],
        PACIENTE.documentNumber                                                 AS [DOCUMENTO DEL PACIENTE],
        PACIENTE.givenName                                                      AS [NOMBRES DEL PACIENTE],
        PACIENTE.familyName                                                     AS [APELLIDOS DEL PACIENTE],
        CASE
            WHEN CONT.name LIKE '%SURA%' OR PLANES.name LIKE '%SURA%' THEN 'SURA'
            ELSE CONT.name
        END                                                                     AS ASEGURADORA,
        CONT.name                                                               AS CONTRATO,
        PLANES.name                                                             AS [PLAN],
        BS.saleNumber                                                           AS [NUMERO DE VENTA],
        CONVERT(VARCHAR, BS.saleDate, 23)                                      AS [FECHA DE LA VENTA],
        CONCAT(U.givenName, ' ', U.familyName)                                 AS [RESPONSABLE DE LA VENTA],
        CASE
            WHEN BS.state = 'A' THEN 'ACTIVA'
            WHEN BS.state = 'E' THEN 'ELIMINADA'
            WHEN BS.state = 'F' THEN 'FACTURADA'
        END                                                                     AS [ESTADO DE VENTA],
        LOC_HIST.name                                                           AS [ULTIMA UBICACION DEL PACIENTE],
        PROD.legalCode                                                          AS CUPS,
        CAST(BSOAPD.quantityBill AS INT)                                        AS CANTIDAD,
        PROD.name                                                               AS PRODUCTO,
        PT.name                                                                 AS [TIPO DE PRODUCTO],
        -- Determina si el procedimiento es principal consultando EHREventSurgeryProcedures
        IIF(
            (SELECT TOP 1 ehrespro.isPrincipal
             FROM EHREventSurgeryProcedures ehrespro
             INNER JOIN EHREvents ehre ON ehrespro.idEHREvent = ehre.idEHREvent
             WHERE ehrespro.idProduct    = PROD.idProduct
               AND PACIENTE.idUser       = ehre.idPatient
               AND CONVERT(varchar, ehre.actionRecordedDate, 23) = CONVERT(varchar, BS.saleDate, 23)
            ) = 1, 'SI', 'NO')                                                 AS Principal,
        MONTH(INGRESO.dateDischarge)                                            AS MES,
        YEAR(INGRESO.dateDischarge)                                             AS [ANO]
    FROM BillStateOfAccountHeader BSOAH
    INNER JOIN encounters INGRESO ON BSOAH.idEncounter = INGRESO.idEncounter
        AND INGRESO.dateDischarge IS NOT NULL
    INNER JOIN BillStateOfAccountProductDetails BSOAPD
        ON BSOAH.idStateOfAccountHeader = BSOAPD.idStateOfAccountHeader
    LEFT  JOIN billSales      BS    ON BSOAPD.idSale         = BS.idSale
    LEFT  JOIN billSaleDetails BSD  ON BSOAPD.idSaleDetail   = BSD.idSaleDetail
    INNER JOIN products       PROD  ON BSOAPD.idProduct      = PROD.idProduct
    INNER JOIN productTypes   PT    ON BSOAPD.idProductType  = PT.idProductType
    INNER JOIN users          COMPANY ON BSOAPD.idUserCompany = COMPANY.idUser
    INNER JOIN contracts      CONT  ON BSOAPD.idContract     = CONT.idContract
    INNER JOIN contractPlans  PLANES ON BSOAPD.idPlan        = PLANES.idPlan
    INNER JOIN users          U     ON BS.idUserRecord       = U.idUser
    INNER JOIN users          PACIENTE ON INGRESO.idUserPatient = PACIENTE.idUser
    OUTER APPLY (
        SELECT TOP 1 PL.name
        FROM encounterHistoricalRecords EHR
        INNER JOIN physicalLocations PL ON EHR.idLocation = PL.idPhysicalLocation
        WHERE BS.idEncounter = EHR.idEncounter
        ORDER BY EHR.idRecord DESC
    ) AS LOC_HIST
    WHERE
        PT.idProductType IN $productTypesCup
        AND BS.state <> 'E'
        AND BSOAPD.idContract IN $contratosCup
        AND BSOAPD.idPlan NOT IN $exclPlanesCup
        AND INGRESO.dateDischarge >= '$fechaInicio'
        AND INGRESO.dateDischarge <= '$fechaFin 23:59:59'
    OPTION (RECOMPILE)
";

$sqlInsertCup = "INSERT INTO sura_cups_principal
    (ingreso, fecha_ingreso, fecha_egreso, documento, nombres, apellidos,
     aseguradora, contrato, plan, venta, fecha_venta, responsable_venta,
     estado, ubicacion, cups, cantidad, descripcion, tipo_producto,
     principal, year, mes, fecha_reporte, hora_reporte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryCupPrincipal, 'sura_cups_principal', $sqlInsertCup,
        fn($row) => [
            $row['INGRESO'],                     $row['FECHA DE INGRESO'],
            $row['FECHA DE EGRESO'],             $row['DOCUMENTO DEL PACIENTE'],
            $row['NOMBRES DEL PACIENTE'],        $row['APELLIDOS DEL PACIENTE'],
            $row['ASEGURADORA'],                 $row['CONTRATO'],
            $row['PLAN'],                        $row['NUMERO DE VENTA'],
            $row['FECHA DE LA VENTA'],           $row['RESPONSABLE DE LA VENTA'],
            $row['ESTADO DE VENTA'],             $row['ULTIMA UBICACION DEL PACIENTE'],
            $row['CUPS'],                        $row['CANTIDAD'],
            $row['PRODUCTO'],                    $row['TIPO DE PRODUCTO'],
            $row['Principal'],                   $row['ANO'],
            $row['MES'],
            $fechaReporte,                       $horaReporte,
        ],
        RUNNER
    );
} catch (Throwable $e) {
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 7: INTERNACIONES SIN PRIORIDAD (contrato 172)
// ═══════════════════════════════════════════════════════════════════════════

$cfgInterSinP       = cargarParamUnico($pg, RUNNER, 'inter_sinprioridad');
$contratoInterSinP  = $cfgInterSinP['contrato'];
$legalCodesInterSinP = $cfgInterSinP['legalCodes'];

etlLog("── {$cfgInterSinP['label']} (contrato $contratoInterSinP)", 'INFO', RUNNER);

$queryInterSinP = "
    SELECT
        INGRESO.identifier                                                      AS INGRESO,
        CONVERT(VARCHAR, INGRESO.dateStart,     23)                            AS [FECHA DE INGRESO],
        CONVERT(VARCHAR, INGRESO.dateDischarge, 23)                            AS [FECHA DE EGRESO],
        CASE
            WHEN CONT.name LIKE '%SURA%' OR PLANES.name LIKE '%SURA%' THEN 'SURA'
            ELSE CONT.name
        END                                                                     AS ASEGURADORA,
        CONT.name                                                               AS CONTRATO,
        PLANES.name                                                             AS [PLAN],
        CONVERT(INT, FLOOR(bsapd.quantityBill))                                AS Cantidad,
        PACIENTE.documentNumber                                                 AS DOCUMENTO,
        P.legalCode                                                             AS CUPS,
        MONTH(INGRESO.dateDischarge)                                            AS MES,
        YEAR(INGRESO.dateDischarge)                                             AS [YEAR]
    FROM billSales            AS bs
    INNER JOIN encounters     AS INGRESO ON bs.idEncounter   = INGRESO.idEncounter
    INNER JOIN encounterRecords ER        ON INGRESO.idEncounter = ER.idEncounter
    INNER JOIN users          PACIENTE    ON INGRESO.idUserPatient = PACIENTE.idUser
    INNER JOIN contracts      AS CONT     ON bs.idContract    = CONT.idContract
    INNER JOIN contractPlans  AS PLANES   ON bs.idPlan = PLANES.idPlan
        AND CONT.idContract = PLANES.idContract
    INNER JOIN billSaleDetails AS bsd     ON bs.idSale        = bsd.idSale
    INNER JOIN BillStateOfAccountProductDetails AS bsapd
        ON bsd.idSaleDetail = bsapd.idSaleDetail
    INNER JOIN BillStateOfAccountContracts AS bsac
        ON bsapd.identifier = bsac.contractNumber
    INNER JOIN BillStateOfAccountHeader   AS bsah
        ON bsah.idStateOfAccountHeader = bsapd.idStateOfAccountHeader
    INNER JOIN products P ON bsapd.idProduct = P.idProduct
    WHERE
        INGRESO.idUserCompany   <> 1
        AND bsac.idContract      = $contratoInterSinP
        AND INGRESO.idEncounter  = bsah.idEncounter
        AND P.legalCode          IN $legalCodesInterSinP
        AND INGRESO.dateDischarge >= '$fechaInicio'
        AND INGRESO.dateDischarge <= '$fechaFin 23:59:59'
    OPTION (RECOMPILE)
";

$sqlInsertInterSinP = "INSERT INTO sura_inter_sinprioridad
    (ingreso, fecha_ingreso, cantidad, fecha_egreso, aseguradora, contrato, plan, documento, cup, mes, year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

try {
    etlTransferir($mssql, $pg, $queryInterSinP, 'sura_inter_sinprioridad', $sqlInsertInterSinP,
        fn($row) => [
            $row['INGRESO'],      $row['FECHA DE INGRESO'], $row['Cantidad'],
            $row['FECHA DE EGRESO'], $row['ASEGURADORA'],   $row['CONTRATO'],
            $row['PLAN'],         $row['DOCUMENTO'],         $row['CUPS'],
            $row['MES'],          $row['YEAR'],
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
    etlLog("Proceso completado con $errores ERROR(ES). Revisar logs. Fecha: $fechaReporte $horaReporte", 'ERROR', RUNNER);
    exit(1);
}
