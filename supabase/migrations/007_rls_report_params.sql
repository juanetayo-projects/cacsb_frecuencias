-- Habilita RLS en las tablas de configuración paramétrica (report_params, cat_cups)
-- siguiendo el mismo patrón de las tablas ETL: lectura para usuarios autenticados.

ALTER TABLE report_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_cups       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer ETL"
    ON report_params FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Usuarios autenticados pueden leer ETL"
    ON cat_cups FOR SELECT
    TO authenticated
    USING (true);
