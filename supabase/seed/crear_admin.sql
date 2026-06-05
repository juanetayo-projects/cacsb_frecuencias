-- ============================================================
--  CREAR USUARIO ADMINISTRADOR
--  Ejecutar en Supabase SQL Editor DESPUÉS de crear el usuario
--  en Authentication → Users → Add user
--
--  Datos del usuario:
--    Email:  juan.etayo@cacsantabarbara.co
--    Nombre: Juan Carlos Etayo
--    Rol:    admin
-- ============================================================

-- Paso 1: Buscar el UUID del usuario recién creado en auth.users
SELECT id, email, created_at
FROM auth.users
WHERE email = 'juan.etayo@cacsantabarbara.co';

-- Paso 2: Insertar el perfil en la tabla usuarios
-- (Reemplazar el UUID con el resultado del paso anterior)
INSERT INTO usuarios (id, nombre, rol, activo, creado_por)
SELECT
    id,
    'Juan Carlos Etayo' AS nombre,
    'admin'             AS rol,
    true                AS activo,
    'system'            AS creado_por
FROM auth.users
WHERE email = 'juan.etayo@cacsantabarbara.co'
ON CONFLICT (id) DO UPDATE SET
    nombre     = EXCLUDED.nombre,
    rol        = EXCLUDED.rol,
    activo     = EXCLUDED.activo;

-- Verificar que quedó creado
SELECT u.id, u.nombre, u.rol, u.activo, a.email
FROM usuarios u
JOIN auth.users a ON u.id = a.id
WHERE a.email = 'juan.etayo@cacsantabarbara.co';
