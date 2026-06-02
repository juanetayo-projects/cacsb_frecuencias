-- ============================================================
--  MIGRATION 002 — Tablas Normativas (Valores Contratados)
--  Estas tablas contienen los valores pactados con aseguradoras
--  Se gestionan desde el módulo de Normativas de la app
-- ============================================================

-- ── EMSSANAR NORMATIVAS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emssanar_nt_alta_cont (
    id                       SERIAL PRIMARY KEY,
    cup                      VARCHAR(10) NOT NULL,
    costo_unitario           NUMERIC(18,2) DEFAULT 0,
    agrupador                VARCHAR(150),
    subagrupador             VARCHAR(150),
    evento_mes_subagrupador  INTEGER DEFAULT 0,
    vigencia_desde           DATE,
    vigencia_hasta           DATE,
    creado_en                TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por          VARCHAR(100),
    UNIQUE(cup)
);

CREATE TABLE IF NOT EXISTS emssanar_nt_alta_sub (
    id                       SERIAL PRIMARY KEY,
    cup                      VARCHAR(10) NOT NULL,
    costo_unitario           NUMERIC(18,2) DEFAULT 0,
    agrupador                VARCHAR(150),
    subagrupador             VARCHAR(150),
    evento_mes_subagrupador  INTEGER DEFAULT 0,
    vigencia_desde           DATE,
    vigencia_hasta           DATE,
    creado_en                TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por          VARCHAR(100),
    UNIQUE(cup)
);

CREATE TABLE IF NOT EXISTS emssanar_nt_media_cont (
    id                       SERIAL PRIMARY KEY,
    cup                      VARCHAR(10) NOT NULL,
    costo_unitario           NUMERIC(18,2) DEFAULT 0,
    agrupador                VARCHAR(150),
    subagrupador             VARCHAR(150),
    evento_mes_subagrupador  INTEGER DEFAULT 0,
    vigencia_desde           DATE,
    vigencia_hasta           DATE,
    creado_en                TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por          VARCHAR(100),
    UNIQUE(cup)
);

CREATE TABLE IF NOT EXISTS emssanar_nt_media_sub (
    id                       SERIAL PRIMARY KEY,
    cup                      VARCHAR(10) NOT NULL,
    costo_unitario           NUMERIC(18,2) DEFAULT 0,
    agrupador                VARCHAR(150),
    subagrupador             VARCHAR(150),
    evento_mes_subagrupador  INTEGER DEFAULT 0,
    vigencia_desde           DATE,
    vigencia_hasta           DATE,
    creado_en                TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por          VARCHAR(100),
    UNIQUE(cup)
);

-- ── NUEVA EPS NORMATIVA ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS neps_nt (
    id              SERIAL PRIMARY KEY,
    cup             VARCHAR(10) NOT NULL,
    agrupador       VARCHAR(150),
    subagrupador    VARCHAR(150),
    vigencia_desde  DATE,
    vigencia_hasta  DATE,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por VARCHAR(100),
    UNIQUE(cup)
);

-- ── ASMET SALUD NORMATIVA ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asmet_salud_nt (
    id              SERIAL PRIMARY KEY,
    cup             VARCHAR(10) NOT NULL,
    costo_unitario  NUMERIC(18,2) DEFAULT 0,
    agrupador       VARCHAR(150),
    subagrupador    VARCHAR(150),
    vigencia_desde  DATE,
    vigencia_hasta  DATE,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por VARCHAR(100),
    UNIQUE(cup)
);

-- ── HISTORIAL DE CAMBIOS EN NORMATIVAS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS normativas_historial (
    id              SERIAL PRIMARY KEY,
    tabla           VARCHAR(50) NOT NULL,
    cup             VARCHAR(10) NOT NULL,
    campo           VARCHAR(50) NOT NULL,
    valor_anterior  TEXT,
    valor_nuevo     TEXT,
    usuario         VARCHAR(100),
    fecha_cambio    TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÍNDICES ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_neps_nt_cup        ON neps_nt(cup);
CREATE INDEX IF NOT EXISTS idx_asmet_nt_cup       ON asmet_salud_nt(cup);
CREATE INDEX IF NOT EXISTS idx_emssanar_nt_ac_cup ON emssanar_nt_alta_cont(cup);
CREATE INDEX IF NOT EXISTS idx_emssanar_nt_as_cup ON emssanar_nt_alta_sub(cup);
CREATE INDEX IF NOT EXISTS idx_emssanar_nt_mc_cup ON emssanar_nt_media_cont(cup);
CREATE INDEX IF NOT EXISTS idx_emssanar_nt_ms_cup ON emssanar_nt_media_sub(cup);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- NOTA: Las políticas de admin que referencian la tabla 'usuarios' se aplican
--       en 004_rls_policies.sql (después de que ambas tablas existen).
--       Aquí solo habilitamos RLS con política básica de lectura.

ALTER TABLE emssanar_nt_alta_cont  ENABLE ROW LEVEL SECURITY;
ALTER TABLE emssanar_nt_alta_sub   ENABLE ROW LEVEL SECURITY;
ALTER TABLE emssanar_nt_media_cont ENABLE ROW LEVEL SECURITY;
ALTER TABLE emssanar_nt_media_sub  ENABLE ROW LEVEL SECURITY;
ALTER TABLE neps_nt                ENABLE ROW LEVEL SECURITY;
ALTER TABLE asmet_salud_nt         ENABLE ROW LEVEL SECURITY;
ALTER TABLE normativas_historial   ENABLE ROW LEVEL SECURITY;

-- Política simple: todos los usuarios autenticados pueden leer y escribir normativas
-- (Los permisos granulares por rol se configuran en 004_rls_policies.sql)
CREATE POLICY "nt_alta_cont_auth"  ON emssanar_nt_alta_cont  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nt_alta_sub_auth"   ON emssanar_nt_alta_sub   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nt_media_cont_auth" ON emssanar_nt_media_cont FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nt_media_sub_auth"  ON emssanar_nt_media_sub  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "neps_nt_auth"       ON neps_nt                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "asmet_nt_auth"      ON asmet_salud_nt         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "historial_auth"     ON normativas_historial   FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE emssanar_nt_alta_cont IS 'Normativa contractual Emssanar Alta Complejidad Contributivo — valores pactados por CUP';
COMMENT ON TABLE neps_nt               IS 'Normativa contractual Nueva EPS — agrupadores por CUP';
COMMENT ON TABLE asmet_salud_nt        IS 'Normativa contractual Asmet Salud — costo unitario por CUP';
COMMENT ON TABLE normativas_historial  IS 'Historial de cambios en tablas normativas';
