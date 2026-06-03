-- ============================================================
--  MIGRATION 004 — Tabla sura_nt en Supabase
--  Sincronizada desde www.redgesencro.net/redgesencro_control
--  por el runner etl/runners/redgesencro_sync.php
-- ============================================================

CREATE TABLE IF NOT EXISTS sura_nt (
    id                       SERIAL PRIMARY KEY,
    cup                      VARCHAR(10) NOT NULL,
    agrupador                VARCHAR(150),
    subagrupador             VARCHAR(150),
    cme_ajustado             NUMERIC(18,2) DEFAULT 0,
    eventos_mes_subagrupador INTEGER DEFAULT 0,
    eventos_cups             INTEGER DEFAULT 0,
    descripcion              VARCHAR(200),
    mayor_igual_cinco        BOOLEAN DEFAULT FALSE,
    sincronizado_en          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cup)
);

CREATE INDEX IF NOT EXISTS idx_sura_nt_cup       ON sura_nt(cup);
CREATE INDEX IF NOT EXISTS idx_sura_nt_agrupador ON sura_nt(agrupador);

ALTER TABLE sura_nt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sura_nt_auth" ON sura_nt FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE sura_nt IS 'Normativa SURA sincronizada desde redgesencro_control — cme_ajustado por CUP';

SELECT 'sura_nt creada exitosamente' AS resultado;
