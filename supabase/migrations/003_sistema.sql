-- ============================================================
--  MIGRATION 003 — Tablas del Sistema
--  Usuarios, Log CronJob, Parámetros, Log Email
-- ============================================================

-- ── USUARIOS (extiende Supabase Auth) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
    id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    rol             VARCHAR(20) NOT NULL DEFAULT 'viewer'
                    CHECK (rol IN ('admin', 'analista', 'viewer')),
    activo          BOOLEAN DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    creado_por      VARCHAR(100),
    PRIMARY KEY (id)
);

-- Trigger: actualizar ultimo_acceso en cada login
CREATE OR REPLACE FUNCTION actualizar_ultimo_acceso()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── LOG DE EJECUCIONES CRONJOB ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS log_cronjob (
    id                      SERIAL PRIMARY KEY,
    runner                  VARCHAR(50) NOT NULL,
    fecha_inicio            TIMESTAMPTZ,
    fecha_fin               TIMESTAMPTZ,
    duracion_seg            NUMERIC(10,2),
    registros_insertados    INTEGER DEFAULT 0,
    estado                  VARCHAR(10) NOT NULL DEFAULT 'RUNNING'
                            CHECK (estado IN ('OK', 'ERROR', 'RUNNING')),
    mensaje_error           TEXT,
    tablas_afectadas        TEXT,   -- JSON con tabla:cantidad
    creado_en               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_cronjob_runner ON log_cronjob(runner);
CREATE INDEX IF NOT EXISTS idx_log_cronjob_fecha  ON log_cronjob(fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_log_cronjob_estado ON log_cronjob(estado);

-- ── PARÁMETROS DE LA APLICACIÓN ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parametros (
    clave           VARCHAR(100) PRIMARY KEY,
    valor           TEXT NOT NULL,
    descripcion     TEXT,
    tipo            VARCHAR(20) DEFAULT 'string'
                    CHECK (tipo IN ('string', 'number', 'boolean', 'json', 'secret')),
    editable        BOOLEAN DEFAULT TRUE,
    actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
    actualizado_por VARCHAR(100)
);

-- ── LOG DE EMAILS ENVIADOS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS log_email (
    id              SERIAL PRIMARY KEY,
    destinatarios   TEXT NOT NULL,
    asunto          VARCHAR(200),
    seccion         VARCHAR(100),
    filtros         JSONB,
    formato         VARCHAR(20) CHECK (formato IN ('excel', 'pdf', 'ambos')),
    estado          VARCHAR(10) CHECK (estado IN ('OK', 'ERROR')),
    mensaje_error   TEXT,
    resend_id       VARCHAR(100),
    enviado_por     VARCHAR(100),
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_cronjob    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros     ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_email      ENABLE ROW LEVEL SECURITY;

-- Usuarios: cada uno ve su propio perfil; admin ve todos
CREATE POLICY "Usuarios ven su propio perfil"
  ON usuarios FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR
    EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'));

CREATE POLICY "Admin gestiona usuarios"
  ON usuarios FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'));

-- Log CronJob: todos los autenticados pueden leer; solo sistema puede escribir
CREATE POLICY "Todos leen log_cronjob"
  ON log_cronjob FOR SELECT TO authenticated USING (true);

-- Parámetros: todos leen, solo admin modifica
CREATE POLICY "Todos leen parametros"
  ON parametros FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin modifica parametros"
  ON parametros FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin'));

-- Log Email: todos los autenticados leen
CREATE POLICY "Todos leen log_email"
  ON log_email FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE usuarios    IS 'Perfiles de usuario (extiende Supabase Auth)';
COMMENT ON TABLE log_cronjob IS 'Historial de ejecuciones de los runners ETL';
COMMENT ON TABLE parametros  IS 'Configuración centralizada de la aplicación';
COMMENT ON TABLE log_email   IS 'Historial de emails enviados via Resend';
