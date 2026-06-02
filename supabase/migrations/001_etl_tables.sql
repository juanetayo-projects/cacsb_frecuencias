-- ============================================================
--  MIGRATION 001 — Tablas ETL de Ejecución
--  Clínica Santa Bárbara — CACSB Frecuencias
--  Estas tablas se llenan automáticamente por los runners PHP
--  Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ── EMSSANAR ALTA COMPLEJIDAD ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emssanar_frecuencias_alta_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    venta           VARCHAR(50),
    estado          VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    descripcion     VARCHAR(200),
    tipo_producto   VARCHAR(50),
    valor_unitario  NUMERIC(18,2),
    year            SMALLINT,
    mes             SMALLINT,
    fecha_reporte   DATE,
    hora_reporte    TIME
);

CREATE TABLE IF NOT EXISTS emssanar_frecuencias_alta_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    venta           VARCHAR(50),
    estado          VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    descripcion     VARCHAR(200),
    tipo_producto   VARCHAR(50),
    valor_unitario  NUMERIC(18,2),
    year            SMALLINT,
    mes             SMALLINT,
    fecha_reporte   DATE,
    hora_reporte    TIME
);

CREATE TABLE IF NOT EXISTS emssanar_internaciones_alta_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    documento       VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    mes             SMALLINT,
    year            SMALLINT
);

CREATE TABLE IF NOT EXISTS emssanar_internaciones_alta_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    documento       VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    mes             SMALLINT,
    year            SMALLINT
);

CREATE TABLE IF NOT EXISTS emssanar_ventas_alta_cont (
    id              SERIAL PRIMARY KEY,
    "Facturada"     INTEGER DEFAULT 0,
    "Pendiente"     INTEGER DEFAULT 0,
    "Eliminada"     INTEGER DEFAULT 0,
    "EstadoCuenta"  INTEGER DEFAULT 0,
    mes             VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS emssanar_ventas_alta_sub (
    id              SERIAL PRIMARY KEY,
    "Facturada"     INTEGER DEFAULT 0,
    "Pendiente"     INTEGER DEFAULT 0,
    "Eliminada"     INTEGER DEFAULT 0,
    "EstadoCuenta"  INTEGER DEFAULT 0,
    mes             VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS emssanar_resumen_alta_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    numero_factura  VARCHAR(30),
    mes_anio_venta  VARCHAR(10),
    total_cantidad  INTEGER,
    valor_total     BIGINT,
    mes_anio_factura VARCHAR(10),
    fecha_reporte   VARCHAR(25)
);

CREATE TABLE IF NOT EXISTS emssanar_resumen_alta_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    numero_factura  VARCHAR(30),
    mes_anio_venta  VARCHAR(10),
    total_cantidad  INTEGER,
    valor_total     BIGINT,
    mes_anio_factura VARCHAR(10),
    fecha_reporte   VARCHAR(25)
);

-- ── EMSSANAR MEDIANA COMPLEJIDAD ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emssanar_frecuencias_media_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    venta           VARCHAR(50),
    estado          VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    descripcion     VARCHAR(200),
    tipo_producto   VARCHAR(50),
    valor_unitario  NUMERIC(18,2),
    year            SMALLINT,
    mes             SMALLINT,
    fecha_reporte   DATE,
    hora_reporte    TIME
);

CREATE TABLE IF NOT EXISTS emssanar_frecuencias_media_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    venta           VARCHAR(50),
    estado          VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    descripcion     VARCHAR(200),
    tipo_producto   VARCHAR(50),
    valor_unitario  NUMERIC(18,2),
    year            SMALLINT,
    mes             SMALLINT,
    fecha_reporte   DATE,
    hora_reporte    TIME
);

CREATE TABLE IF NOT EXISTS emssanar_internaciones_media_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    documento       VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    mes             SMALLINT,
    year            SMALLINT
);

CREATE TABLE IF NOT EXISTS emssanar_internaciones_media_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    documento       VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    mes             SMALLINT,
    year            SMALLINT
);

CREATE TABLE IF NOT EXISTS emssanar_ventas_media_cont (
    id              SERIAL PRIMARY KEY,
    "Facturada"     INTEGER DEFAULT 0,
    "Pendiente"     INTEGER DEFAULT 0,
    "Eliminada"     INTEGER DEFAULT 0,
    "EstadoCuenta"  INTEGER DEFAULT 0,
    mes             VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS emssanar_ventas_media_sub (
    id              SERIAL PRIMARY KEY,
    "Facturada"     INTEGER DEFAULT 0,
    "Pendiente"     INTEGER DEFAULT 0,
    "Eliminada"     INTEGER DEFAULT 0,
    "EstadoCuenta"  INTEGER DEFAULT 0,
    mes             VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS emssanar_resumen_media_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    numero_factura  VARCHAR(30),
    mes_anio_venta  VARCHAR(10),
    total_cantidad  INTEGER,
    valor_total     BIGINT,
    mes_anio_factura VARCHAR(10),
    fecha_reporte   VARCHAR(25)
);

CREATE TABLE IF NOT EXISTS emssanar_resumen_media_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    numero_factura  VARCHAR(30),
    mes_anio_venta  VARCHAR(10),
    total_cantidad  INTEGER,
    valor_total     BIGINT,
    mes_anio_factura VARCHAR(10),
    fecha_reporte   VARCHAR(25)
);

-- ── EMSSANAR EVENTO ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emssanar_frecuencias_evento_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    municipio       VARCHAR(100),
    ultima_ubicacion VARCHAR(100),
    estado_ingreso  VARCHAR(20),
    contrato        VARCHAR(100),
    numero_venta    VARCHAR(50),
    estado          VARCHAR(20),
    tipo_producto   VARCHAR(50),
    producto        VARCHAR(200),
    cup             VARCHAR(10),
    cantidad        BIGINT,
    valor_unitario  BIGINT,
    year            SMALLINT,
    mes             SMALLINT,
    fecha_reporte   DATE,
    hora_reporte    TIME
);

CREATE TABLE IF NOT EXISTS emssanar_frecuencias_evento_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    municipio       VARCHAR(100),
    ultima_ubicacion VARCHAR(100),
    estado_ingreso  VARCHAR(20),
    contrato        VARCHAR(100),
    numero_venta    VARCHAR(50),
    estado          VARCHAR(20),
    tipo_producto   VARCHAR(50),
    producto        VARCHAR(200),
    cup             VARCHAR(10),
    cantidad        BIGINT,
    valor_unitario  BIGINT,
    year            SMALLINT,
    mes             SMALLINT,
    fecha_reporte   DATE,
    hora_reporte    TIME
);

-- ── SURA ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sura_frecuencias (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    documento       VARCHAR(20),
    nombres         VARCHAR(100),
    apellidos       VARCHAR(100),
    aseguradora     VARCHAR(50),
    contrato        VARCHAR(100),
    plan            VARCHAR(100),
    venta           VARCHAR(50),
    fecha_venta     DATE,
    responsable_venta VARCHAR(200),
    estado          VARCHAR(20),
    ubicacion       VARCHAR(150),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    descripcion     VARCHAR(200),
    tipo_producto   VARCHAR(50),
    rips            VARCHAR(5),
    year            SMALLINT,
    mes             SMALLINT,
    activo          INTEGER DEFAULT 0,
    valor           NUMERIC(18,2),
    "fechaReporte"  DATE,
    "horaReporte"   TIME
);

CREATE TABLE IF NOT EXISTS sura_internaciones (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    "fechaIngreso"  DATE,
    "fechaEgreso"   DATE,
    aseguradora     VARCHAR(50),
    contrato        VARCHAR(100),
    plan            VARCHAR(100),
    documento       VARCHAR(20),
    cup             VARCHAR(10),
    mes             SMALLINT,
    year            SMALLINT
);

CREATE TABLE IF NOT EXISTS sura_ventas (
    id              SERIAL PRIMARY KEY,
    "Facturada"     INTEGER DEFAULT 0,
    "Pendiente"     INTEGER DEFAULT 0,
    "Eliminada"     INTEGER DEFAULT 0,
    "EstadoCuenta"  INTEGER DEFAULT 0,
    mes             VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS sura_evento_cont (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    ultima_ubicacion VARCHAR(150),
    producto        VARCHAR(200),
    tipo_producto   VARCHAR(50),
    cup             VARCHAR(10),
    cantidad        BIGINT,
    valor_unitario  NUMERIC(18,2),
    mes_anio_factura VARCHAR(10),
    fecha_reporte   DATE
);

CREATE TABLE IF NOT EXISTS sura_evento_sub (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    ultima_ubicacion VARCHAR(150),
    producto        VARCHAR(200),
    tipo_producto   VARCHAR(50),
    cup             VARCHAR(10),
    cantidad        BIGINT,
    valor_unitario  NUMERIC(18,2),
    mes_anio_factura VARCHAR(10),
    fecha_reporte   DATE
);

CREATE TABLE IF NOT EXISTS sura_pgp_ejecucion (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    no_identificacion VARCHAR(20),
    cup             VARCHAR(10),
    plan            VARCHAR(100),
    cantidad        INTEGER,
    valor_unitario  NUMERIC(18,2),
    valor_total     NUMERIC(18,2),
    producto        VARCHAR(200),
    mes_anio_venta  VARCHAR(10),
    fecha_reporte   DATE,
    valor_contratado NUMERIC(18,2)  -- campo pendiente de confirmar fuente
);

CREATE TABLE IF NOT EXISTS sura_cups_principal (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   DATE,
    fecha_egreso    DATE,
    documento       VARCHAR(20),
    nombres         VARCHAR(100),
    apellidos       VARCHAR(100),
    aseguradora     VARCHAR(50),
    contrato        VARCHAR(100),
    plan            VARCHAR(100),
    venta           VARCHAR(50),
    fecha_venta     DATE,
    responsable_venta VARCHAR(200),
    estado          VARCHAR(20),
    ubicacion       VARCHAR(150),
    cups            VARCHAR(10),
    cantidad        INTEGER,
    descripcion     VARCHAR(200),
    tipo_producto   VARCHAR(50),
    principal       VARCHAR(5),
    year            SMALLINT,
    mes             SMALLINT,
    "fechaReporte"  DATE,
    "horaReporte"   TIME
);

CREATE TABLE IF NOT EXISTS sura_inter_sinprioridad (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    "fechaIngreso"  DATE,
    cantidad        INTEGER,
    "fechaEgreso"   DATE,
    aseguradora     VARCHAR(50),
    contrato        VARCHAR(100),
    plan            VARCHAR(100),
    documento       VARCHAR(20),
    cup             VARCHAR(10),
    mes             SMALLINT,
    year            SMALLINT
);

-- ── NUEVA EPS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS neps_frecuencias (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   VARCHAR(20),
    fecha_egreso    VARCHAR(20),
    identificacion  VARCHAR(20),
    municipio       VARCHAR(100),
    contrato        VARCHAR(100),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    producto        VARCHAR(200),
    mes             SMALLINT,
    ano             SMALLINT,
    valor_unitario  NUMERIC(18,2),
    fecha_reporte   DATE,
    hora_reporte    TIME
);

CREATE TABLE IF NOT EXISTS neps_frecuencias_venta (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_venta     VARCHAR(20),
    identificacion  VARCHAR(20),
    municipio       VARCHAR(100),
    contrato        VARCHAR(100),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    producto        VARCHAR(200),
    mes             SMALLINT,
    ano             SMALLINT,
    valor_unitario  NUMERIC(18,2),
    fecha_reporte   DATE,
    hora_reporte    TIME
);

-- ── ASMET SALUD ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asmet_salud_frecuencias (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    no_identificacion VARCHAR(20),
    cup             VARCHAR(10),
    plan            VARCHAR(100),
    producto        VARCHAR(200),
    cantidad        INTEGER,
    mes_anio_venta  VARCHAR(10),
    fecha_reporte   DATE
);

CREATE TABLE IF NOT EXISTS asmet_salud_resumen_factura (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    cup             VARCHAR(10),
    plan            VARCHAR(100),
    numero_factura  VARCHAR(30),
    mes_anio_venta  VARCHAR(10),
    total_cantidad  INTEGER,
    valor_total     BIGINT,
    mes_anio_factura VARCHAR(10),
    fecha_reporte   DATE
);

-- ── DISPENSARIO MÉDICO ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dispensario_medico_frecuencias (
    id              SERIAL PRIMARY KEY,
    ingreso         VARCHAR(50),
    fecha_ingreso   VARCHAR(20),
    fecha_egreso    VARCHAR(20),
    numero_venta    VARCHAR(50),
    estado_venta    VARCHAR(20),
    cup             VARCHAR(10),
    cantidad        INTEGER,
    valor_total     NUMERIC(18,2),
    valor_unitario  NUMERIC(18,2),
    producto        VARCHAR(200),
    tipo_producto   VARCHAR(50),
    mes             VARCHAR(5),
    anio            SMALLINT,
    fecha_reporte   DATE,
    hora_reporte    TIME
);

-- ── ÍNDICES para optimizar consultas del dashboard ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_emssanar_frec_ac_mes  ON emssanar_frecuencias_alta_cont(mes, year);
CREATE INDEX IF NOT EXISTS idx_emssanar_frec_as_mes  ON emssanar_frecuencias_alta_sub(mes, year);
CREATE INDEX IF NOT EXISTS idx_emssanar_frec_mc_mes  ON emssanar_frecuencias_media_cont(mes, year);
CREATE INDEX IF NOT EXISTS idx_emssanar_frec_ms_mes  ON emssanar_frecuencias_media_sub(mes, year);
CREATE INDEX IF NOT EXISTS idx_sura_frec_mes         ON sura_frecuencias(mes, year);
CREATE INDEX IF NOT EXISTS idx_neps_frec_mes         ON neps_frecuencias(mes, ano);
CREATE INDEX IF NOT EXISTS idx_neps_venta_mes        ON neps_frecuencias_venta(mes, ano);
CREATE INDEX IF NOT EXISTS idx_asmet_mes             ON asmet_salud_frecuencias(mes_anio_venta);
CREATE INDEX IF NOT EXISTS idx_disp_mes              ON dispensario_medico_frecuencias(mes, anio);
CREATE INDEX IF NOT EXISTS idx_sura_pgp_mes          ON sura_pgp_ejecucion(mes_anio_venta);

-- ── Deshabilitar RLS en tablas ETL (solo lectura desde app) ───────────────────
ALTER TABLE emssanar_frecuencias_alta_cont  ENABLE ROW LEVEL SECURITY;
ALTER TABLE emssanar_frecuencias_alta_sub   ENABLE ROW LEVEL SECURITY;
ALTER TABLE emssanar_frecuencias_media_cont ENABLE ROW LEVEL SECURITY;
ALTER TABLE emssanar_frecuencias_media_sub  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sura_frecuencias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE neps_frecuencias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE neps_frecuencias_venta          ENABLE ROW LEVEL SECURITY;
ALTER TABLE asmet_salud_frecuencias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispensario_medico_frecuencias  ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden leer todo
CREATE POLICY "Usuarios autenticados pueden leer ETL"
  ON emssanar_frecuencias_alta_cont FOR SELECT
  TO authenticated USING (true);
-- (Repetir para cada tabla ETL en producción)

COMMENT ON TABLE emssanar_frecuencias_alta_cont  IS 'ETL: Emssanar Frecuencias Alta Complejidad Contributivo';
COMMENT ON TABLE emssanar_frecuencias_alta_sub   IS 'ETL: Emssanar Frecuencias Alta Complejidad Subsidiado';
COMMENT ON TABLE neps_frecuencias                IS 'ETL: Nueva EPS Frecuencias por Egreso (contrato 231)';
COMMENT ON TABLE sura_pgp_ejecucion              IS 'ETL: SURA PGP Ejecución (contrato 218) — valor_contratado pendiente confirmar fuente';
