<?php
/**
 * runners/emssanar.php
 * ═══════════════════════════════════════════════════════════════════════════
 * ETL EMSSANAR — Reemplaza 14 scripts originales:
 *
 *   Contributivo Alta    (contrato 205) → 4 tablas
 *   Contributivo Mediana (contrato 203) → 4 tablas
 *   Subsidiado Alta      (contrato 206) → 4 tablas
 *   Subsidiado Mediana   (contrato 204) → 4 tablas
 *   Evento Contributivo  (contrato 45)  → 1 tabla
 *   Evento Subsidiado    (contrato 41)  → 1 tabla
 *
 * Parámetro de rango de fechas: ETL_MESES_ATRAS (definido en .env, default=3)
 * ═══════════════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/etl.php';

const RUNNER = 'EMSSANAR';

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
// BLOQUE 1: FRECUENCIAS (4 contratos)
// Tablas: emssanar_frecuencias_alta_cont | media_cont | alta_sub | media_sub
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Definición de los 4 contratos de frecuencias.
 * Solo difieren en idContract y tabla destino.
 */
$configFrecuencias = cargarConfigBloque($pg, RUNNER, 'frecuencias');

foreach ($configFrecuencias as $cfg) {
    $idContrato = $cfg['contrato'];
    $tabla      = $cfg['tabla'];
    $label      = $cfg['label'];

    etlLog("── Frecuencias $label (contrato $idContrato)", 'INFO', RUNNER);

    $query = "
        SELECT
            INGRESO.identifier                                                  AS Ingreso,
            CAST(INGRESO.dateStart    AS DATE)                                  AS FechaIngreso,
            CAST(INGRESO.dateDischarge AS DATE)                                 AS FechaEgreso,
            BS.saleNumber                                                       AS NumeroVenta,
            CAST(BS.saleDate AS DATE)                                           AS FechaVenta,
            CASE
                WHEN BS.state = 'A' THEN 'ACTIVA'
                WHEN BS.state = 'F' THEN 'FACTURADA'
                ELSE BS.state
            END                                                                 AS EstadoVenta,
            IIF(PROD.legalCode IN ('00P0000511','00P0000512'),
                LEFT(PROD.legalCode, 8),
                LEFT(PROD.legalCode, 6))                                        AS Cups,
            CAST(BSOAPD.quantity AS INT)                                        AS Cantidad,
            PROD.name                                                           AS Producto,
            PT.name                                                             AS TipoProducto,
            BSOAPD.value                                                        AS ValorUnitario,
            MONTH(BS.saleDate)                                                  AS Mes,
            YEAR(BS.saleDate)                                                   AS Anio
        FROM BillStateOfAccountHeader BSOAH
        INNER JOIN encounters INGRESO
            ON BSOAH.idEncounter = INGRESO.idEncounter
            AND INGRESO.dateDischarge IS NOT NULL
        INNER JOIN BillStateOfAccountProductDetails BSOAPD
            ON BSOAH.idStateOfAccountHeader = BSOAPD.idStateOfAccountHeader
        INNER JOIN billSales BS ON BSOAPD.idSale = BS.idSale
        INNER JOIN billSaleDetails BSD ON BSOAPD.idSaleDetail = BSD.idSaleDetail
        INNER JOIN products PROD ON BSOAPD.idProduct = PROD.idProduct
        INNER JOIN productTypes PT ON BSOAPD.idProductType = PT.idProductType
        WHERE
            BSOAPD.idContract       = $idContrato
            AND PT.idProductType    IN (1, 2, 3, 4, 9)
            AND BS.state            <> 'E'
            AND INGRESO.idUserCompany = 108240
            AND BSOAH.status        IN ('AC', 'FC', 'FP')
            AND PROD.legalCode      NOT IN ('110A01','107M01','129A02','129A01','132P01')
            AND BS.saleDate         >= '$fechaInicio'
            AND BS.saleDate         <= '$fechaFin 23:59:59'
        OPTION (RECOMPILE)
    ";

    $sqlInsert = "INSERT INTO \"$tabla\"
        (ingreso, fecha_ingreso, fecha_egreso, venta, estado, cup, cantidad,
         descripcion, tipo_producto, valor_unitario, year, mes, fecha_reporte, hora_reporte)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    try {
        etlTransferir($mssql, $pg, $query, $tabla, $sqlInsert,
            fn($row) => [
                $row['Ingreso'],      $row['FechaIngreso'],  $row['FechaEgreso'],
                $row['NumeroVenta'],  $row['EstadoVenta'],   $row['Cups'],
                $row['Cantidad'],     $row['Producto'],      $row['TipoProducto'],
                $row['ValorUnitario'],$row['Anio'],          $row['Mes'],
                $fechaReporte,        $horaReporte,
            ],
            RUNNER
        );
    } catch (Throwable $e) {
        $errores++;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 2: INTERNACIONES (4 contratos)
// Tablas: emssanar_internaciones_alta_cont | media_cont | alta_sub | media_sub
//
// NOTA: Los legalCode difieren entre "alta" (amp) y "mediana" (reducido)
// ═══════════════════════════════════════════════════════════════════════════

$configInternaciones = cargarConfigBloque($pg, RUNNER, 'internaciones');

foreach ($configInternaciones as $cfg) {
    $idContrato = $cfg['contrato'];
    $tabla      = $cfg['tabla'];
    $label      = $cfg['label'];
    $codes      = $cfg['legalCodes'];

    etlLog("── Internaciones $label (contrato $idContrato)", 'INFO', RUNNER);

    $query = "
        SELECT
            e.identifier                                                        AS Ingreso,
            CAST(e.dateStart      AS DATE)                                      AS FechaIngreso,
            CAST(e.dateDischarge  AS DATE)                                      AS FechaEgreso,
            up.documentNumber                                                   AS DocumentoPaciente,
            p.legalCode                                                         AS Cups,
            CAST(IIF(bsd.quantityStateOfAccount > 0,
                bsd.quantityStateOfAccount,
                (bsd.quantity - bsd.quantityReturned)) AS INT)                  AS Cantidad,
            MONTH(bs.saleDate)                                                  AS Mes,
            YEAR(bs.saleDate)                                                   AS [Year]
        FROM billSales AS bs
        INNER JOIN encounters                         AS e    ON bs.idEncounter  = e.idEncounter
        INNER JOIN users                              AS up   ON e.idUserPatient = up.idUser
        INNER JOIN billSaleDetails                    AS bsd  ON bs.idSale       = bsd.idSale
        INNER JOIN products                           AS p    ON bsd.idProduct   = p.idProduct
        INNER JOIN BillStateOfAccountProductDetails   AS bsapd ON bsd.idSaleDetail = bsapd.idSaleDetail
        INNER JOIN BillStateOfAccountContracts        AS bsac ON bsapd.identifier  = bsac.contractNumber
        INNER JOIN BillStateOfAccountHeader           AS bsah ON bsah.idStateOfAccountHeader = bsapd.idStateOfAccountHeader
        WHERE
            bs.state            <> 'E'
            AND bsac.idContract  = $idContrato
            AND e.idUserCompany  = 108240
            AND bsah.status      IN ('AC','FC','FP')
            AND p.legalCode      IN $codes
            AND bs.saleDate      >= '$fechaInicio'
            AND bs.saleDate      <= '$fechaFin 23:59:59'
        OPTION (RECOMPILE)
    ";

    $sqlInsert = "INSERT INTO \"$tabla\"
        (ingreso, fecha_ingreso, fecha_egreso, documento, cup, cantidad, mes, year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    try {
        etlTransferir($mssql, $pg, $query, $tabla, $sqlInsert,
            fn($row) => [
                $row['Ingreso'],        $row['FechaIngreso'],
                $row['FechaEgreso'],    $row['DocumentoPaciente'],
                $row['Cups'],           $row['Cantidad'],
                $row['Mes'],            $row['Year'],
            ],
            RUNNER
        );
    } catch (Throwable $e) {
        $errores++;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 3: VENTAS (4 contratos) — Resumen agregado por mes
// Tablas: emssanar_ventas_alta_cont | media_cont | alta_sub | media_sub
// ═══════════════════════════════════════════════════════════════════════════

$configVentas = cargarConfigBloque($pg, RUNNER, 'ventas');

foreach ($configVentas as $cfg) {
    $idContrato = $cfg['contrato'];
    $tabla      = $cfg['tabla'];
    $label      = $cfg['label'];

    etlLog("── Ventas $label (contrato $idContrato)", 'INFO', RUNNER);

    $query = "
        SELECT
            CASE MONTH(bs.saleDate)
                WHEN 1  THEN 'Enero'      WHEN 2  THEN 'Febrero'   WHEN 3  THEN 'Marzo'
                WHEN 4  THEN 'Abril'      WHEN 5  THEN 'Mayo'       WHEN 6  THEN 'Junio'
                WHEN 7  THEN 'Julio'      WHEN 8  THEN 'Agosto'     WHEN 9  THEN 'Septiembre'
                WHEN 10 THEN 'Octubre'    WHEN 11 THEN 'Noviembre'  WHEN 12 THEN 'Diciembre'
            END AS Mes,
            SUM(CASE WHEN bs.state = 'F'   THEN 1 ELSE 0 END)                  AS Facturada,
            0                                                                   AS Pendiente,
            SUM(CASE WHEN bs.state = 'E'   THEN 1 ELSE 0 END)                  AS Eliminada,
            SUM(CASE
                WHEN bs.state NOT IN ('F','E') AND bsapd.idSaleDetail IS NOT NULL
                THEN 1 ELSE 0
            END)                                                                AS EstadoCuenta
        FROM billSales bs
        INNER JOIN billSaleDetails bsd ON bs.idSale = bsd.idSale
        INNER JOIN products p ON bsd.idProduct = p.idProduct
        LEFT JOIN BillStateOfAccountProductDetails bsapd
            ON bsd.idSaleDetail = bsapd.idSaleDetail
            AND bsapd.idContract = $idContrato
        WHERE
            bs.idContract        = $idContrato
            AND p.idProductType  IN (1, 2, 3, 4)
            AND bs.saleDate      >= '$fechaInicio'
            AND bs.saleDate      <= '$fechaFin 23:59:59'
        GROUP BY MONTH(bs.saleDate)
        OPTION (RECOMPILE)
    ";

    $sqlInsert = "INSERT INTO \"$tabla\"
        (facturada, pendiente, eliminada, estado_cuenta, mes)
        VALUES (?, ?, ?, ?, ?)";

    try {
        etlTransferir($mssql, $pg, $query, $tabla, $sqlInsert,
            fn($row) => [
                $row['Facturada'], $row['Pendiente'],
                $row['Eliminada'], $row['EstadoCuenta'], $row['Mes'],
            ],
            RUNNER
        );
    } catch (Throwable $e) {
        $errores++;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 4: RESUMEN POR FACTURA (4 contratos)
// Tablas: emssanar_resumen_alta_cont | media_cont | alta_sub | media_sub
// ═══════════════════════════════════════════════════════════════════════════

$configResumen = cargarConfigBloque($pg, RUNNER, 'resumen');

foreach ($configResumen as $cfg) {
    $idContrato = $cfg['contrato'];
    $tabla      = $cfg['tabla'];
    $label      = $cfg['label'];

    etlLog("── Resumen x Factura $label (contrato $idContrato)", 'INFO', RUNNER);

    $query = "
        SELECT
            e.identifier                                                        AS Ingreso,
            CONCAT(RTRIM(bi.invoicePrefix), '-', bi.invoiceNumber)             AS NumeroFactura,
            FORMAT(bs.saleDate,   'MM/yyyy')                                   AS MesAnioVenta,
            SUM(CAST(bid.quantity AS INT))                                      AS TotalCantidad,
            SUM(CAST(bid.quantity AS BIGINT) * CAST(bid.value AS BIGINT))      AS ValorTotal,
            FORMAT(bi.dateBegin,  'MM/yyyy')                                   AS MesAnioFactura
        FROM billInvoices bi
        INNER JOIN billInvoiceDetails bid ON bi.idInvoice    = bid.idInvoice
        INNER JOIN billSales          bs  ON bs.idSale       = bid.idSale
        INNER JOIN encounters         e   ON bs.idEncounter  = e.idEncounter
        INNER JOIN products           p   ON bid.idProduct   = p.idProduct
        INNER JOIN productTypes       pt  ON p.idProductType = pt.idProductType
        WHERE
            bs.state             <> 'E'
            AND bi.idUserCompany  = 108240
            AND bi.invoiceState   = 'A'
            AND pt.idProductType  IN (1, 2, 3, 4)
            AND bi.idContract     = $idContrato
            AND bi.dateBegin      >= '$fechaInicio'
            AND bi.dateBegin      <= '$fechaFin 23:59:59'
        GROUP BY
            bi.invoicePrefix, bi.invoiceNumber,
            bs.saleDate, bi.dateBegin, e.identifier
        OPTION (RECOMPILE)
    ";

    $sqlInsert = "INSERT INTO \"$tabla\"
        (ingreso, numero_factura, mes_anio_venta, total_cantidad, valor_total,
         mes_anio_factura, fecha_reporte)
        VALUES (?, ?, ?, ?, ?, ?, ?)";

    try {
        etlTransferir($mssql, $pg, $query, $tabla, $sqlInsert,
            fn($row) => [
                $row['Ingreso'],       $row['NumeroFactura'],  $row['MesAnioVenta'],
                $row['TotalCantidad'], $row['ValorTotal'],     $row['MesAnioFactura'],
                $fechaReporte,
            ],
            RUNNER
        );
    } catch (Throwable $e) {
        $errores++;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 5: EVENTO (2 contratos: contributivo 45 / subsidiado 41)
// Tablas: emssanar_frecuencias_evento_cont | evento_sub
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
            gpd.name                                                            AS Municipio,
            loc.name                                                            AS UltimaUbicacion,
            CASE
                WHEN e.idStatus = 1 THEN 'Planeado'
                WHEN e.idStatus = 2 THEN 'Activo'
                WHEN e.idStatus = 3 THEN 'En egreso'
                WHEN e.idStatus = 4 THEN 'Egresado'
                WHEN e.idStatus = 5 THEN 'Cancelado'
                ELSE 'N/A'
            END                                                                 AS EstadoIngreso,
            cont.name                                                           AS Contrato,
            bs.saleNumber                                                       AS NumeroVenta,
            CASE
                WHEN bs.state = 'A' THEN 'ACTIVA'
                WHEN bs.state = 'F' THEN 'FACTURADA'
                ELSE bs.state
            END                                                                 AS Estado,
            pt.name                                                             AS TipoProducto,
            LEFT(p.name, 200)                                                   AS Producto,
            IIF(p.legalCode IN ('00P0000511','00P0000512'),
                LEFT(p.legalCode, 8),
                LEFT(p.legalCode, 6))                                          AS Cup,
            CAST(bid.quantity AS BIGINT)                                        AS Cantidad,
            CAST(bid.value    AS BIGINT)                                        AS ValorUnitario,
            YEAR(bi.invoiceDate)                                                AS [Year],
            MONTH(bi.invoiceDate)                                               AS Mes
        FROM billInvoices bi
        INNER JOIN billInvoiceDetails bid ON bi.idInvoice = bid.idInvoice
        INNER JOIN BillStateOfAccountProductDetails bsapd
            ON bid.idSaleDetail = bsapd.idSaleDetail
        INNER JOIN billSales    bs   ON bs.idSale    = bsapd.idSale
        INNER JOIN contracts    cont ON bsapd.idContract = cont.idContract
        INNER JOIN encounters   e    ON bs.idEncounter   = e.idEncounter
        INNER JOIN products     p    ON bid.idProduct     = p.idProduct
        INNER JOIN productTypes pt   ON p.idProductType  = pt.idProductType
        INNER JOIN users        u    ON e.idUserPatient   = u.idUser
        INNER JOIN userPeople   up   ON u.idUser          = up.idUser
        INNER JOIN generalPoliticalDivisions gpd
            ON up.idHomePlacePoliticalDivision = gpd.idPoliticalDivision
        OUTER APPLY (
            SELECT TOP 1 pc.name
            FROM encounterRecords er
            INNER JOIN physicalLocations pc ON pc.idPhysicalLocation = er.idActualLocation
            WHERE er.idEncounter = e.idEncounter
            ORDER BY er.idEncounter DESC
        ) AS loc
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
        (ingreso, municipio, ultima_ubicacion, estado_ingreso, contrato,
         numero_venta, estado, tipo_producto, producto, cup,
         cantidad, valor_unitario, year, mes, fecha_reporte, hora_reporte)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    try {
        etlTransferir($mssql, $pg, $query, $tabla, $sqlInsert,
            fn($row) => [
                $row['Ingreso'],      $row['Municipio'],       $row['UltimaUbicacion'],
                $row['EstadoIngreso'],$row['Contrato'],        $row['NumeroVenta'],
                $row['Estado'],       $row['TipoProducto'],    $row['Producto'],
                $row['Cup'],          $row['Cantidad'],        $row['ValorUnitario'],
                $row['Year'],         $row['Mes'],
                $fechaReporte,        $horaReporte,
            ],
            RUNNER
        );
    } catch (Throwable $e) {
        $errores++;
    }
}

// ── Resumen final ─────────────────────────────────────────────────────────
etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
if ($errores === 0) {
    etlLog("Proceso completado SIN errores. Fecha: $fechaReporte $horaReporte", 'OK', RUNNER);
} else {
    etlLog("Proceso completado con $errores ERROR(ES). Revisar logs. Fecha: $fechaReporte $horaReporte", 'ERROR', RUNNER);
    exit(1);
}
