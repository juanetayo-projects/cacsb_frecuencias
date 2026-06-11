-- ═══════════════════════════════════════════════════════════════════════════
-- 005_report_params.sql
-- Capa de parámetros para los runners ETL: permite ajustar contratos, planes,
-- catálogos de CUPS, etc. por bloque/variante sin modificar el código PHP.
-- ═══════════════════════════════════════════════════════════════════════════

-- Catálogo de CUPS por categoría (reutilizable entre bloques/runners)
CREATE TABLE IF NOT EXISTS cat_cups (
    id          SERIAL PRIMARY KEY,
    categoria   VARCHAR(50) NOT NULL,
    cup         VARCHAR(15) NOT NULL,
    descripcion VARCHAR(200),
    UNIQUE (categoria, cup)
);

-- Parámetros por bloque/variante de cada runner
CREATE TABLE IF NOT EXISTS report_params (
    id                    SERIAL PRIMARY KEY,
    runner                VARCHAR(20)  NOT NULL,
    bloque                VARCHAR(30)  NOT NULL,
    variante              VARCHAR(30)  NOT NULL DEFAULT 'default',
    label                 VARCHAR(100) NOT NULL,
    tabla_destino         VARCHAR(60)  NOT NULL,
    id_contrato           INTEGER,
    id_contratos          INTEGER[],
    id_planes_excluidos   INTEGER[],
    id_planes_incluidos   INTEGER[],
    id_product_types      INTEGER[],
    id_status             INTEGER[],
    legal_codes_categoria VARCHAR(50),
    legal_codes_modo      VARCHAR(10) DEFAULT 'IN',
    bsoah_status          TEXT[],
    id_user_company       INTEGER DEFAULT 108240,
    bill_price_list       INTEGER,
    campo_fecha_filtro    VARCHAR(30) DEFAULT 'saleDate',
    activo                BOOLEAN NOT NULL DEFAULT TRUE,
    orden                 INTEGER NOT NULL DEFAULT 0,
    UNIQUE (runner, bloque, variante)
);

-- ── Catálogos de CUPS para internaciones EMSSANAR ──────────────────────────
INSERT INTO cat_cups (categoria, cup) VALUES
    ('emssanar_internaciones_alta', '110A01'),
    ('emssanar_internaciones_alta', '107M01'),
    ('emssanar_internaciones_alta', '10A002'),
    ('emssanar_internaciones_alta', '10A001'),
    ('emssanar_internaciones_alta', '10A004'),
    ('emssanar_internaciones_alta', '124P01'),
    ('emssanar_internaciones_alta', '890611'),
    ('emssanar_internaciones_media', '110A01'),
    ('emssanar_internaciones_media', '129A02'),
    ('emssanar_internaciones_media', '129A01'),
    ('emssanar_internaciones_media', '132P01')
ON CONFLICT (categoria, cup) DO NOTHING;

-- ── EMSSANAR: Frecuencias (4 variantes) ────────────────────────────────────
INSERT INTO report_params (runner, bloque, variante, label, tabla_destino, id_contrato, orden) VALUES
    ('EMSSANAR', 'frecuencias', 'alta_cont',  'Alta Contributivo',     'emssanar_frecuencias_alta_cont',  205, 1),
    ('EMSSANAR', 'frecuencias', 'media_cont', 'Mediana Contributivo',  'emssanar_frecuencias_media_cont', 203, 2),
    ('EMSSANAR', 'frecuencias', 'alta_sub',   'Alta Subsidiado',       'emssanar_frecuencias_alta_sub',   206, 3),
    ('EMSSANAR', 'frecuencias', 'media_sub',  'Mediana Subsidiado',    'emssanar_frecuencias_media_sub',  204, 4)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── EMSSANAR: Internaciones (4 variantes, con catálogo de CUPS) ────────────
INSERT INTO report_params (runner, bloque, variante, label, tabla_destino, id_contrato, legal_codes_categoria, orden) VALUES
    ('EMSSANAR', 'internaciones', 'alta_cont',  'Alta Contributivo',    'emssanar_internaciones_alta_cont',  205, 'emssanar_internaciones_alta',  1),
    ('EMSSANAR', 'internaciones', 'media_cont', 'Mediana Contributivo', 'emssanar_internaciones_media_cont', 203, 'emssanar_internaciones_media', 2),
    ('EMSSANAR', 'internaciones', 'alta_sub',   'Alta Subsidiado',      'emssanar_internaciones_alta_sub',   206, 'emssanar_internaciones_alta',  3),
    ('EMSSANAR', 'internaciones', 'media_sub',  'Mediana Subsidiado',   'emssanar_internaciones_media_sub',  204, 'emssanar_internaciones_media', 4)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── EMSSANAR: Ventas (4 variantes) ─────────────────────────────────────────
INSERT INTO report_params (runner, bloque, variante, label, tabla_destino, id_contrato, orden) VALUES
    ('EMSSANAR', 'ventas', 'alta_cont',  'Alta Contributivo',    'emssanar_ventas_alta_cont',  205, 1),
    ('EMSSANAR', 'ventas', 'media_cont', 'Mediana Contributivo', 'emssanar_ventas_media_cont', 203, 2),
    ('EMSSANAR', 'ventas', 'alta_sub',   'Alta Subsidiado',      'emssanar_ventas_alta_sub',   206, 3),
    ('EMSSANAR', 'ventas', 'media_sub',  'Mediana Subsidiado',   'emssanar_ventas_media_sub',  204, 4)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── EMSSANAR: Resumen por factura (4 variantes) ────────────────────────────
INSERT INTO report_params (runner, bloque, variante, label, tabla_destino, id_contrato, orden) VALUES
    ('EMSSANAR', 'resumen', 'alta_cont',  'Alta Contributivo',    'emssanar_resumen_alta_cont',  205, 1),
    ('EMSSANAR', 'resumen', 'media_cont', 'Mediana Contributivo', 'emssanar_resumen_media_cont', 203, 2),
    ('EMSSANAR', 'resumen', 'alta_sub',   'Alta Subsidiado',      'emssanar_resumen_alta_sub',   206, 3),
    ('EMSSANAR', 'resumen', 'media_sub',  'Mediana Subsidiado',   'emssanar_resumen_media_sub',  204, 4)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── EMSSANAR: Evento (2 variantes) ─────────────────────────────────────────
INSERT INTO report_params (runner, bloque, variante, label, tabla_destino, id_contrato, orden) VALUES
    ('EMSSANAR', 'evento', 'cont', 'Evento Contributivo', 'emssanar_frecuencias_evento_cont', 45, 1),
    ('EMSSANAR', 'evento', 'sub',  'Evento Subsidiado',   'emssanar_frecuencias_evento_sub',  41, 2)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── SURA: Evento (2 variantes) ─────────────────────────────────────────────
INSERT INTO report_params (runner, bloque, variante, label, tabla_destino, id_contrato, orden) VALUES
    ('SURA', 'evento', 'cont', 'Evento Contributivo', 'sura_evento_cont', 39, 1),
    ('SURA', 'evento', 'sub',  'Evento Subsidiado',   'sura_evento_sub',  66, 2)
ON CONFLICT (runner, bloque, variante) DO NOTHING;
