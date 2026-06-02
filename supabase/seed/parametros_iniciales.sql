-- ============================================================
--  SEED — Parámetros iniciales de la aplicación
--  Ejecutar DESPUÉS de las migrations
-- ============================================================

INSERT INTO parametros (clave, valor, descripcion, tipo, editable) VALUES
-- ETL Configuration
('etl_meses_atras',       '3',                    'Meses hacia atrás para el rango de fechas ETL', 'number',  true),
('etl_batch_size',        '500',                  'Tamaño de lote para commits intermedios',        'number',  true),
('etl_timezone',          'America/Bogota',        'Zona horaria para el ETL',                      'string',  true),
('etl_log_level',         '1',                    '0=solo errores, 1=info, 2=debug',                'number',  true),
('etl_hora_ejecucion',    '00:00',                 'Hora de ejecución del CronJob (HH:MM)',          'string',  true),

-- App Configuration
('app_nombre',            'Control de Contratos CACSB', 'Nombre de la aplicación',               'string',  true),
('app_subtitulo',         'Frecuencias de Uso',    'Subtítulo de la aplicación',                    'string',  true),
('app_version',           '1.0.0',                 'Versión actual de la app',                      'string',  false),

-- Email Configuration (Resend)
('resend_from',           'reportes@cacsb.net',    'Email remitente para Resend',                   'string',  true),
('email_asunto_default',  'Reporte CACSB - Control de Contratos', 'Asunto por defecto para emails','string',  true),
('email_auto_envio',      'false',                 'Envío automático después del CronJob',           'boolean', true),
('email_destinatarios',   '[]',                    'Lista de destinatarios automáticos (JSON array)','json',    true),

-- Dashboard Configuration
('dashboard_filas_tabla', '25',                   'Filas por defecto en tablas del dashboard',      'number',  true),
('dashboard_color_ok',    '#1a4a7a',              'Color para cumplimiento >= 100%',                'string',  true),
('dashboard_color_alert', '#b02020',              'Color para cumplimiento < 100%',                 'string',  true),

-- Azure SQL Source (solo referencia, credenciales en .env)
('mssql_host',            'goreplica.database.windows.net', 'Servidor Azure SQL réplica',          'string',  false),
('mssql_db',              'goMedisysCo_ClinicaSantaBarbara','Base de datos origen',               'string',  false),
('id_user_company',       '108240',               'ID de empresa en el sistema origen',             'number',  false)

ON CONFLICT (clave) DO NOTHING;
