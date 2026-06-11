-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 3: parametrización de los 11 bloques de query única
-- (sura x6, asmetsalud x2, dispensario x1, nuevaeps x2)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── cat_cups: categoría de internaciones SURA (bloques internaciones / inter_sinprioridad)
INSERT INTO cat_cups (categoria, cup) VALUES
    ('sura_internaciones', '110A01'),
    ('sura_internaciones', '107M01'),
    ('sura_internaciones', '10A002'),
    ('sura_internaciones', '10A001'),
    ('sura_internaciones', '10A004'),
    ('sura_internaciones', '124P01')
ON CONFLICT (categoria, cup) DO NOTHING;

-- ── SURA ───────────────────────────────────────────────────────────────────
INSERT INTO report_params
    (runner, bloque, variante, label, tabla_destino, id_contratos, id_planes_excluidos, orden)
VALUES
    ('SURA', 'frecuencias', 'default', 'Frecuencias', 'sura_frecuencias',
        ARRAY[63,172], ARRAY[443,360,317,116], 1),
    ('SURA', 'ventas', 'default', 'Ventas', 'sura_ventas',
        ARRAY[63,172], ARRAY[443,360,317,116], 1)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

INSERT INTO report_params
    (runner, bloque, variante, label, tabla_destino, id_contratos, id_planes_excluidos, id_product_types, orden)
VALUES
    ('SURA', 'cups_principal', 'default', 'Cup Principal', 'sura_cups_principal',
        ARRAY[63,172], ARRAY[443,360,317,116], ARRAY[3], 1)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

INSERT INTO report_params
    (runner, bloque, variante, label, tabla_destino, id_contrato, legal_codes_categoria, orden)
VALUES
    ('SURA', 'internaciones', 'default', 'Internaciones', 'sura_internaciones',
        172, 'sura_internaciones', 1),
    ('SURA', 'inter_sinprioridad', 'default', 'Internaciones sin prioridad', 'sura_inter_sinprioridad',
        172, 'sura_internaciones', 1)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

INSERT INTO report_params
    (runner, bloque, variante, label, tabla_destino, id_contrato, orden)
VALUES
    ('SURA', 'pgp_ejecucion', 'default', 'PGP Ejecución', 'sura_pgp_ejecucion', 218, 1)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── ASMETSALUD ───────────────────────────────────────────────────────────────
INSERT INTO report_params
    (runner, bloque, variante, label, tabla_destino, id_contrato, id_planes_incluidos, orden)
VALUES
    ('ASMETSALUD', 'frecuencias', 'default', 'Frecuencias', 'asmet_salud_frecuencias',
        59, ARRAY[659,660], 1),
    ('ASMETSALUD', 'resumen_factura', 'default', 'Resumen por Factura', 'asmet_salud_resumen_factura',
        59, ARRAY[659,660], 1)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── DISPENSARIO ──────────────────────────────────────────────────────────────
INSERT INTO report_params
    (runner, bloque, variante, label, tabla_destino, id_contrato, orden)
VALUES
    ('DISPENSARIO', 'frecuencias', 'default', 'Frecuencias', 'dispensario_medico_frecuencias', 198, 1)
ON CONFLICT (runner, bloque, variante) DO NOTHING;

-- ── NUEVA EPS ────────────────────────────────────────────────────────────────
INSERT INTO report_params
    (runner, bloque, variante, label, tabla_destino, id_contrato, bill_price_list, orden)
VALUES
    ('NUEVAEPS', 'frecuencias_egreso', 'default', 'Frecuencias por Egreso', 'neps_frecuencias', 231, 409, 1),
    ('NUEVAEPS', 'frecuencias_venta', 'default', 'Frecuencias por Venta', 'neps_frecuencias_venta', 231, 409, 2)
ON CONFLICT (runner, bloque, variante) DO NOTHING;
