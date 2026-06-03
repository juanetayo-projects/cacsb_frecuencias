<?php
/**
 * config.php — Configuración centralizada del ETL
 *
 * Lee variables desde:
 *   1. Archivo .env (ejecución local)
 *   2. Variables de entorno del sistema (GitHub Actions)
 */
declare(strict_types=1);

// Cargar .env si existe (solo en local, en GitHub Actions no existe)
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        $linea = trim($linea);
        if ($linea === '' || $linea[0] === '#' || !str_contains($linea, '=')) continue;
        [$clave, $valor] = explode('=', $linea, 2);
        // Solo setear si no está ya definida (GitHub Actions tiene precedencia)
        if (!isset($_ENV[trim($clave)])) {
            $_ENV[trim($clave)] = trim($valor);
        }
    }
}

// Leer también desde getenv() — GitHub Actions pone variables aquí
foreach (['MSSQL_HOST','MSSQL_DB','MSSQL_USER','MSSQL_PASS',
          'PG_HOST','PG_DB','PG_USER','PG_PASS','PG_PORT',
          'ETL_MESES_ATRAS','ETL_BATCH_SIZE','ETL_TIMEZONE','ETL_LOG_LEVEL'] as $var) {
    if (empty($_ENV[$var]) && getenv($var) !== false) {
        $_ENV[$var] = getenv($var);
    }
}

// Validar variables críticas
$requeridas = ['MSSQL_HOST','MSSQL_DB','MSSQL_USER','MSSQL_PASS',
               'PG_HOST','PG_DB','PG_USER','PG_PASS'];
foreach ($requeridas as $var) {
    if (empty($_ENV[$var])) {
        die("[CONFIG] ERROR: Variable '$var' no definida.\n");
    }
}

// ── Azure SQL Server (origen) ─────────────────────────────────────────────────
define('MSSQL_HOST', $_ENV['MSSQL_HOST']);
define('MSSQL_DB',   $_ENV['MSSQL_DB']);
define('MSSQL_USER', $_ENV['MSSQL_USER']);
define('MSSQL_PASS', $_ENV['MSSQL_PASS']);

// ── Supabase PostgreSQL (destino) ─────────────────────────────────────────────
define('PG_HOST', $_ENV['PG_HOST']);
define('PG_DB',   $_ENV['PG_DB']   ?? 'postgres');
define('PG_USER', $_ENV['PG_USER'] ?? 'postgres');
define('PG_PASS', $_ENV['PG_PASS']);
define('PG_PORT', $_ENV['PG_PORT'] ?? '5432');

// ── Parámetros ETL ────────────────────────────────────────────────────────────
define('ETL_MESES_ATRAS', (int)($_ENV['ETL_MESES_ATRAS'] ?? 3));
define('ETL_BATCH_SIZE',  (int)($_ENV['ETL_BATCH_SIZE']  ?? 500));
define('ETL_TIMEZONE', $_ENV['ETL_TIMEZONE'] ?? 'America/Bogota');
define('ETL_LOG_LEVEL', (int)($_ENV['ETL_LOG_LEVEL'] ?? 1));

// ── Configuración PHP ─────────────────────────────────────────────────────────
date_default_timezone_set(ETL_TIMEZONE);
ini_set('memory_limit',     '256M');
ini_set('max_execution_time','0');
error_reporting(E_ALL);
