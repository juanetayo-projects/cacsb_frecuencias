<?php
/**
 * diagnostico/diag_indices.php
 * Diagnóstico puntual: índices existentes sobre BillStateOfAccountProductDetails
 * y conteos de volumen, para evaluar causas de lentitud en los bloques ETL.
 * Uso temporal — no forma parte del ETL diario.
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/etl.php';

const RUNNER = 'DIAGNOSTICO';

try {
    $mssql = conectarMSSQL();
} catch (PDOException $e) {
    etlLog("ERROR CRÍTICO de conexión: " . $e->getMessage(), 'ERROR', RUNNER);
    exit(1);
}

function imprimirResultados(PDO $mssql, string $titulo, string $query): void
{
    etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
    etlLog($titulo, 'INFO', RUNNER);
    try {
        $stmt = $mssql->query($query);
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($filas)) {
            etlLog("  (sin resultados)", 'INFO', RUNNER);
            return;
        }
        foreach ($filas as $fila) {
            etlLog("  " . json_encode($fila, JSON_UNESCAPED_UNICODE), 'INFO', RUNNER);
        }
    } catch (PDOException $e) {
        etlLog("ERROR: " . $e->getMessage(), 'ERROR', RUNNER);
    }
}

// 1. Índices de BillStateOfAccountProductDetails
imprimirResultados($mssql, "Índices de BillStateOfAccountProductDetails", "
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
    SELECT
        i.name                          AS NombreIndice,
        i.type_desc                     AS TipoIndice,
        STRING_AGG(c.name, ', ')
            WITHIN GROUP (ORDER BY ic.key_ordinal) AS Columnas
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic
        ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns c
        ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID('BillStateOfAccountProductDetails')
      AND ic.is_included_column = 0
    GROUP BY i.name, i.type_desc
    ORDER BY i.type_desc, i.name
");

// 2. Índices de billInvoiceDetails / billInvoices / billSales / encounters (tablas clave en evento/ventas)
foreach (['billInvoiceDetails', 'billInvoices', 'billSales', 'encounters', 'billSaleDetails'] as $tabla) {
    imprimirResultados($mssql, "Índices de $tabla", "
        SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
        SELECT
            i.name                          AS NombreIndice,
            i.type_desc                     AS TipoIndice,
            STRING_AGG(c.name, ', ')
                WITHIN GROUP (ORDER BY ic.key_ordinal) AS Columnas
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic
            ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        INNER JOIN sys.columns c
            ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE i.object_id = OBJECT_ID('$tabla')
          AND ic.is_included_column = 0
        GROUP BY i.name, i.type_desc
        ORDER BY i.type_desc, i.name
    ");
}

// 3. Tamaño de tablas clave
imprimirResultados($mssql, "Tamaño de tablas clave (filas y espacio)", "
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
    SELECT
        t.name                              AS Tabla,
        p.rows                              AS Filas,
        CAST(SUM(a.total_pages) * 8 / 1024.0 AS DECIMAL(18,2)) AS TotalMB
    FROM sys.tables t
    INNER JOIN sys.indexes i        ON t.object_id = i.object_id
    INNER JOIN sys.partitions p     ON i.object_id = p.object_id AND i.index_id = p.index_id
    INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
    WHERE t.name IN ('BillStateOfAccountProductDetails','billInvoiceDetails','billInvoices','billSales','encounters','billSaleDetails')
      AND i.index_id IN (0,1)
    GROUP BY t.name, p.rows
    ORDER BY t.name
");

etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
etlLog("Diagnóstico completado", 'OK', RUNNER);
