<?php
/**
 * runners/redgesencro_sync.php
 * ═══════════════════════════════════════════════════════════════════════════
 * Sincroniza tablas normativas desde redgesencro.net → Supabase PostgreSQL
 *
 * Tablas sincronizadas:
 *   sura_nt             → normativa SURA (cup, agrupador, cme_ajustado, etc.)
 *   nt_emssanar_gerencial → normativa gerencial Emssanar
 *
 * Ejecutar: php runners/redgesencro_sync.php
 * CronJob:  Antes que los runners de SURA (22:00 COL = antes de medianoche)
 * ═══════════════════════════════════════════════════════════════════════════
 */

declare(strict_types=1);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/etl.php';

const RUNNER = 'REDGESENCRO_SYNC';

etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
etlLog("Inicio sincronización RedGesEncro → Supabase", 'INFO', RUNNER);

// Credenciales RedGesEncro desde variables de entorno
$rgHost = $_ENV['REDGESENCRO_HOST'] ?? getenv('REDGESENCRO_HOST') ?: 'www.redgesencro.net';
$rgDb   = $_ENV['REDGESENCRO_DB']   ?? getenv('REDGESENCRO_DB')   ?: 'redgesencro_control';
$rgUser = $_ENV['REDGESENCRO_USER'] ?? getenv('REDGESENCRO_USER') ?: 'redgesencro_redgesencro';
$rgPass = $_ENV['REDGESENCRO_PASS'] ?? getenv('REDGESENCRO_PASS') ?: '';

if (empty($rgPass)) {
    etlLog("ERROR: REDGESENCRO_PASS no configurada en .env", 'ERROR', RUNNER);
    exit(1);
}

$errores = 0;

// ── Conexión a RedGesEncro (MySQL) ────────────────────────────────────────
try {
    $rg = new PDO(
        "mysql:host={$rgHost};dbname={$rgDb};charset=utf8mb4",
        $rgUser, $rgPass
    );
    $rg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    etlLog("Conectado a RedGesEncro ({$rgHost})", 'INFO', RUNNER);
} catch (PDOException $e) {
    etlLog("ERROR conectando a RedGesEncro: " . $e->getMessage(), 'ERROR', RUNNER);
    exit(1);
}

// ── Conexión a Supabase (PostgreSQL destino) ──────────────────────────────
try {
    $pg = new PDO(
        "pgsql:host=" . PG_HOST . ";dbname=" . PG_DB . ";port=" . PG_PORT . ";sslmode=require",
        PG_USER, PG_PASS
    );
    $pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    etlLog("Conectado a Supabase PostgreSQL", 'INFO', RUNNER);
} catch (PDOException $e) {
    etlLog("ERROR conectando a Supabase: " . $e->getMessage(), 'ERROR', RUNNER);
    exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 1: Sincronizar sura_nt → sura_nt en Supabase
// ═══════════════════════════════════════════════════════════════════════════

etlLog("── Sincronizando sura_nt...", 'INFO', RUNNER);

$querySuraNt = "
    SELECT
        nt.cup,
        nt.agrupador,
        nt.subagrupador,
        CAST(nt.cme_ajustado AS DECIMAL(18,2))      AS cme_ajustado,
        nt.eventos_mes_subagrupador,
        CAST(nt.eventos_cups AS SIGNED)             AS eventos_cups,
        nt.descripcion,
        nt.mayor_igual_cinco
    FROM sura_nt nt
";

$sqlInsertSuraNt = "
    INSERT INTO sura_nt
        (cup, agrupador, subagrupador, cme_ajustado, eventos_mes_subagrupador,
         eventos_cups, descripcion, mayor_igual_cinco, sincronizado_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON CONFLICT (cup) DO UPDATE SET
        agrupador                = EXCLUDED.agrupador,
        subagrupador             = EXCLUDED.subagrupador,
        cme_ajustado             = EXCLUDED.cme_ajustado,
        eventos_mes_subagrupador = EXCLUDED.eventos_mes_subagrupador,
        eventos_cups             = EXCLUDED.eventos_cups,
        descripcion              = EXCLUDED.descripcion,
        mayor_igual_cinco        = EXCLUDED.mayor_igual_cinco,
        sincronizado_en          = NOW()
";

try {
    $stmt = $rg->query($querySuraNt);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $pg->beginTransaction();
    $stmtIns = $pg->prepare($sqlInsertSuraNt);
    $contador = 0;

    foreach ($rows as $row) {
        $stmtIns->execute([
            $row['cup'],
            $row['agrupador'],
            $row['subagrupador'],
            $row['cme_ajustado'],
            $row['eventos_mes_subagrupador'],
            $row['eventos_cups'],
            $row['descripcion'],
            $row['mayor_igual_cinco'] ? 'true' : 'false',
        ]);
        $contador++;
    }

    $pg->commit();
    etlLog("OK — sura_nt: $contador CUPs sincronizados", 'OK', RUNNER);

} catch (Throwable $e) {
    if ($pg->inTransaction()) $pg->rollBack();
    etlLog("ERROR sura_nt: " . $e->getMessage(), 'ERROR', RUNNER);
    $errores++;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUE 2: Sincronizar nt_emssanar_gerencial (datos de referencia gerencial)
// ═══════════════════════════════════════════════════════════════════════════

etlLog("── Sincronizando nt_emssanar_gerencial...", 'INFO', RUNNER);

// Verificar si la tabla existe en Supabase, si no, crearla
try {
    $pg->exec("
        CREATE TABLE IF NOT EXISTS nt_emssanar_gerencial (
            id              SERIAL PRIMARY KEY,
            cup             VARCHAR(10) NOT NULL,
            agrupador       VARCHAR(150),
            subagrupador    VARCHAR(150),
            cme_ajustado    NUMERIC(18,2) DEFAULT 0,
            sincronizado_en TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(cup)
        )
    ");
} catch (Throwable $e) {
    etlLog("WARN: " . $e->getMessage(), 'WARN', RUNNER);
}

$queryNtGer = "
    SELECT cup, agrupador, subagrupador,
           CAST(cme_ajustado AS DECIMAL(18,2)) AS cme_ajustado
    FROM nt_emssanar_gerencial
";

$sqlInsertNtGer = "
    INSERT INTO nt_emssanar_gerencial (cup, agrupador, subagrupador, cme_ajustado, sincronizado_en)
    VALUES (?, ?, ?, ?, NOW())
    ON CONFLICT (cup) DO UPDATE SET
        agrupador    = EXCLUDED.agrupador,
        subagrupador = EXCLUDED.subagrupador,
        cme_ajustado = EXCLUDED.cme_ajustado,
        sincronizado_en = NOW()
";

try {
    $stmt2 = $rg->query($queryNtGer);
    $rows2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    $pg->beginTransaction();
    $stmtIns2 = $pg->prepare($sqlInsertNtGer);
    $count2 = 0;

    foreach ($rows2 as $row) {
        $stmtIns2->execute([$row['cup'], $row['agrupador'], $row['subagrupador'], $row['cme_ajustado']]);
        $count2++;
    }

    $pg->commit();
    etlLog("OK — nt_emssanar_gerencial: $count2 CUPs sincronizados", 'OK', RUNNER);

} catch (Throwable $e) {
    if ($pg->inTransaction()) $pg->rollBack();
    etlLog("ERROR nt_emssanar_gerencial: " . $e->getMessage(), 'ERROR', RUNNER);
    $errores++;
}

// ── Resumen ───────────────────────────────────────────────────────────────
etlLog("══════════════════════════════════════════", 'INFO', RUNNER);
if ($errores === 0) {
    etlLog("Sincronización completada SIN errores.", 'OK', RUNNER);
} else {
    etlLog("Sincronización con $errores ERROR(ES). Verificar conectividad con RedGesEncro.", 'ERROR', RUNNER);
    exit(1);
}
