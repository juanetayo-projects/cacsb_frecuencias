<?php
/**
 * lib/db.php — Funciones de conexión
 * Origen: Azure SQL Server (goreplica)
 * Destino: Supabase PostgreSQL
 */
declare(strict_types=1);

function conectarMSSQL(int $maxReintentos = 5): PDO
{
    $intento = 0;
    $dsn = sprintf("sqlsrv:server=%s;database=%s;LoginTimeout=30", MSSQL_HOST, MSSQL_DB);

    while ($intento < $maxReintentos) {
        try {
            $pdo = new PDO($dsn, MSSQL_USER, MSSQL_PASS);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->exec("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");
            return $pdo;
        } catch (PDOException $e) {
            $intento++;
            $msg = $e->getMessage();
            $esTransitorio = str_contains($msg, 'availability replica') ||
                             str_contains($msg, 'ghost records') ||
                             str_contains($msg, 'snapshot isolation') ||
                             str_contains($msg, 'SQLSTATE[40001]') ||
                             str_contains($msg, 'SQLSTATE[HY000]');
            if ($esTransitorio && $intento < $maxReintentos) {
                $espera = $intento * 5;
                etlLog("MSSQL error transitorio (intento $intento/$maxReintentos). Reintentando en {$espera}s...", 'WARN');
                sleep($espera);
            } else {
                throw $e;
            }
        }
    }
    throw new RuntimeException("No se pudo conectar a Azure SQL tras $maxReintentos intentos.");
}

function conectarSupabase(): PDO
{
    $dsn = sprintf(
        "pgsql:host=%s;dbname=%s;port=%s;sslmode=require",
        PG_HOST, PG_DB, PG_PORT
    );
    $pdo = new PDO($dsn, PG_USER, PG_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE,       PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $pdo->exec("SET TIME ZONE '" . ETL_TIMEZONE . "'");
    return $pdo;
}
