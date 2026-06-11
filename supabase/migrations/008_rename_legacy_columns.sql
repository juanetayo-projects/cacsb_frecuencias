-- Renombra columnas legacy (camelCase con comillas) a snake_case para alinear
-- el esquema real con 001_etl_tables.sql (ya editado a snake_case) y con los
-- INSERT de los runners PHP (sura.php, emssanar.php), que ya usan snake_case.

ALTER TABLE emssanar_ventas_alta_cont  RENAME COLUMN "Facturada"    TO facturada;
ALTER TABLE emssanar_ventas_alta_cont  RENAME COLUMN "Pendiente"    TO pendiente;
ALTER TABLE emssanar_ventas_alta_cont  RENAME COLUMN "Eliminada"    TO eliminada;
ALTER TABLE emssanar_ventas_alta_cont  RENAME COLUMN "EstadoCuenta" TO estado_cuenta;

ALTER TABLE emssanar_ventas_alta_sub   RENAME COLUMN "Facturada"    TO facturada;
ALTER TABLE emssanar_ventas_alta_sub   RENAME COLUMN "Pendiente"    TO pendiente;
ALTER TABLE emssanar_ventas_alta_sub   RENAME COLUMN "Eliminada"    TO eliminada;
ALTER TABLE emssanar_ventas_alta_sub   RENAME COLUMN "EstadoCuenta" TO estado_cuenta;

ALTER TABLE emssanar_ventas_media_cont RENAME COLUMN "Facturada"    TO facturada;
ALTER TABLE emssanar_ventas_media_cont RENAME COLUMN "Pendiente"    TO pendiente;
ALTER TABLE emssanar_ventas_media_cont RENAME COLUMN "Eliminada"    TO eliminada;
ALTER TABLE emssanar_ventas_media_cont RENAME COLUMN "EstadoCuenta" TO estado_cuenta;

ALTER TABLE emssanar_ventas_media_sub  RENAME COLUMN "Facturada"    TO facturada;
ALTER TABLE emssanar_ventas_media_sub  RENAME COLUMN "Pendiente"    TO pendiente;
ALTER TABLE emssanar_ventas_media_sub  RENAME COLUMN "Eliminada"    TO eliminada;
ALTER TABLE emssanar_ventas_media_sub  RENAME COLUMN "EstadoCuenta" TO estado_cuenta;

ALTER TABLE sura_ventas RENAME COLUMN "Facturada"    TO facturada;
ALTER TABLE sura_ventas RENAME COLUMN "Pendiente"    TO pendiente;
ALTER TABLE sura_ventas RENAME COLUMN "Eliminada"    TO eliminada;
ALTER TABLE sura_ventas RENAME COLUMN "EstadoCuenta" TO estado_cuenta;

ALTER TABLE sura_frecuencias    RENAME COLUMN "fechaReporte" TO fecha_reporte;
ALTER TABLE sura_frecuencias    RENAME COLUMN "horaReporte"  TO hora_reporte;

ALTER TABLE sura_cups_principal RENAME COLUMN "fechaReporte" TO fecha_reporte;
ALTER TABLE sura_cups_principal RENAME COLUMN "horaReporte"  TO hora_reporte;

ALTER TABLE sura_internaciones  RENAME COLUMN "fechaIngreso" TO fecha_ingreso;
ALTER TABLE sura_internaciones  RENAME COLUMN "fechaEgreso"  TO fecha_egreso;

ALTER TABLE sura_inter_sinprioridad RENAME COLUMN "fechaIngreso" TO fecha_ingreso;
ALTER TABLE sura_inter_sinprioridad RENAME COLUMN "fechaEgreso"  TO fecha_egreso;
