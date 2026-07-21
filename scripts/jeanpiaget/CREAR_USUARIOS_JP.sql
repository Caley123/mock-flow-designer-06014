-- Usuarios iniciales Colegio Jean Piaget
-- Ejecutar en Supabase → SQL Editor (proyecto kelylvvoebneugnajiwv)
-- Requiere: extension pgcrypto + tabla usuarios + tipo rol_usuario

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Asegura validar_password (bcrypt + texto plano)
CREATE OR REPLACE FUNCTION public.validar_password(p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT password_hash INTO v_hash
  FROM public.usuarios
  WHERE username = trim(p_username) AND activo = true
  LIMIT 1;

  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  IF v_hash LIKE '$2a$%' OR v_hash LIKE '$2b$%' OR v_hash LIKE '$2y$%' THEN
    RETURN extensions.crypt(trim(p_password), v_hash) = v_hash;
  END IF;

  RETURN v_hash = trim(p_password);
END;
$$;

-- Upsert helper
CREATE OR REPLACE FUNCTION public._sie_upsert_usuario(
  p_username text,
  p_password text,
  p_nombre text,
  p_email text,
  p_rol text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE username = p_username) THEN
    UPDATE public.usuarios SET
      password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
      nombre_completo = p_nombre,
      email = p_email,
      rol = p_rol::rol_usuario,
      activo = true,
      cambio_password_obligatorio = false,
      intentos_fallidos = 0
    WHERE username = p_username;
  ELSE
    INSERT INTO public.usuarios (
      username, password_hash, nombre_completo, email, rol, activo, cambio_password_obligatorio
    ) VALUES (
      p_username,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      p_nombre,
      p_email,
      p_rol::rol_usuario,
      true,
      false
    );
  END IF;
END;
$$;

-- 1) Admin legacy Asiscole
SELECT public._sie_upsert_usuario(
  'Rudeus',
  '123456',
  'Rudeus Admin',
  'rudeus@jeanpiaget.local',
  'Admin'
);

-- 2) Tutor legacy Asiscole
SELECT public._sie_upsert_usuario(
  'TutorRudeus',
  '123456',
  'Tutor Rudeus',
  'tutor.rudeus@jeanpiaget.local',
  'Tutor'
);

-- 3) Andre Mendez Cisneros — Admin
SELECT public._sie_upsert_usuario(
  'Andre',
  'AndreAdmin26',
  'Andre Mendez Cisneros',
  'andre@jeanpiaget.local',
  'Admin'
);

-- 4) Andre — Profesor / Tutor
SELECT public._sie_upsert_usuario(
  'profesor',
  'ProfesorAndre26',
  'Andre Mendez Cisneros',
  'profesor.andre@jeanpiaget.local',
  'Tutor'
);

-- Verificación
SELECT id_usuario, username, nombre_completo, rol, activo
FROM public.usuarios
WHERE username IN ('Rudeus', 'TutorRudeus', 'Andre', 'profesor')
ORDER BY username;

-- Prueba rápida de login (debe devolver true)
SELECT
  public.validar_password('Rudeus', '123456') AS rudeus_ok,
  public.validar_password('TutorRudeus', '123456') AS tutor_rudeus_ok,
  public.validar_password('Andre', 'AndreAdmin26') AS andre_admin_ok,
  public.validar_password('profesor', 'ProfesorAndre26') AS andre_profesor_ok;
