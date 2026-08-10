-- Bootstrap SIE/Asiscole — Proyecto nuevo Supabase (Colegio Jean Piaget)
-- Pegar entero en SQL Editor. Zona horaria relevante: America/Lima.

-- 1) Extensiones
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE public.rol_usuario AS ENUM (
    'Admin', 'Director', 'Supervisor', 'Tutor', 'Padre', 'Docente'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.nivel_educativo AS ENUM ('Primaria', 'Secundaria');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_incidencia AS ENUM (
    'Activa', 'Anulada', 'En revisión', 'Justificada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_evidencia AS ENUM ('Sin evidencia', 'Con evidencia');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) Tablas
CREATE TABLE IF NOT EXISTS public.usuarios (
  id_usuario SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  rol public.rol_usuario NOT NULL,
  grados_asignados JSONB DEFAULT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  cambio_password_obligatorio BOOLEAN NOT NULL DEFAULT false,
  ultimo_acceso TIMESTAMPTZ NULL,
  intentos_fallidos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_username ON public.usuarios (username);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios (rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON public.usuarios (activo);

CREATE TABLE IF NOT EXISTS public.estudiantes (
  id_estudiante SERIAL PRIMARY KEY,
  codigo_barras VARCHAR(50) NOT NULL UNIQUE,
  nombre_completo VARCHAR(255) NOT NULL,
  grado VARCHAR(20) NOT NULL,
  seccion VARCHAR(10) NOT NULL,
  nivel_educativo public.nivel_educativo NOT NULL,
  foto_perfil TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  telefono_contacto VARCHAR(20) NULL,
  email_contacto VARCHAR(255) NULL,
  nombre_responsable VARCHAR(255) NULL,
  parentesco_responsable VARCHAR(50) NULL,
  telefono_emergencia VARCHAR(20) NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estudiantes_codigo ON public.estudiantes (codigo_barras);
CREATE INDEX IF NOT EXISTS idx_estudiantes_nombre ON public.estudiantes (nombre_completo);
CREATE INDEX IF NOT EXISTS idx_estudiantes_nivel_grado_seccion ON public.estudiantes (nivel_educativo, grado, seccion);
CREATE INDEX IF NOT EXISTS idx_estudiantes_activo ON public.estudiantes (activo);
CREATE INDEX IF NOT EXISTS idx_estudiantes_telefono_contacto ON public.estudiantes (telefono_contacto) WHERE telefono_contacto IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_estudiantes_email_contacto ON public.estudiantes (email_contacto) WHERE email_contacto IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.catalogo_faltas (
  id_falta SERIAL PRIMARY KEY,
  nombre_falta VARCHAR(255) NOT NULL,
  categoria TEXT NOT NULL,
  es_grave BOOLEAN NOT NULL DEFAULT false,
  puntos_reincidencia INTEGER NOT NULL DEFAULT 1,
  descripcion TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden_visualizacion INTEGER NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT catalogo_faltas_categoria_len CHECK (char_length(trim(categoria)) BETWEEN 1 AND 50)
);

CREATE INDEX IF NOT EXISTS idx_catalogo_faltas_categoria ON public.catalogo_faltas (categoria);
CREATE INDEX IF NOT EXISTS idx_catalogo_faltas_activo ON public.catalogo_faltas (activo);

CREATE TABLE IF NOT EXISTS public.incidencias (
  id_incidencia SERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  id_falta INTEGER NOT NULL REFERENCES public.catalogo_faltas(id_falta),
  fecha_hora_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_usuario_registro INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  nivel_reincidencia INTEGER NOT NULL DEFAULT 0,
  observaciones TEXT NULL,
  estado_evidencia public.estado_evidencia NOT NULL DEFAULT 'Sin evidencia',
  cantidad_fotos INTEGER NOT NULL DEFAULT 0,
  id_usuario_carga_foto INTEGER NULL REFERENCES public.usuarios(id_usuario),
  fecha_hora_carga_foto TIMESTAMPTZ NULL,
  estado public.estado_incidencia NOT NULL DEFAULT 'Activa',
  motivo_anulacion TEXT NULL,
  id_usuario_anulacion INTEGER NULL REFERENCES public.usuarios(id_usuario),
  fecha_anulacion TIMESTAMPTZ NULL,
  veces_impreso INTEGER NOT NULL DEFAULT 0,
  fecha_ultima_impresion TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_incidencias_estudiante ON public.incidencias (id_estudiante);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON public.incidencias (fecha_hora_registro);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON public.incidencias (estado);
CREATE INDEX IF NOT EXISTS idx_incidencias_falta ON public.incidencias (id_falta);
CREATE INDEX IF NOT EXISTS idx_incidencias_usuario ON public.incidencias (id_usuario_registro);

CREATE TABLE IF NOT EXISTS public.evidencias_fotograficas (
  id_evidencia SERIAL PRIMARY KEY,
  id_incidencia INTEGER NOT NULL REFERENCES public.incidencias(id_incidencia) ON DELETE CASCADE,
  ruta_archivo TEXT NOT NULL,
  nombre_original TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  id_usuario_subida INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_subida VARCHAR(50) NULL,
  marca_agua_aplicada BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_evidencias_incidencia ON public.evidencias_fotograficas (id_incidencia);

CREATE TABLE IF NOT EXISTS public.comentarios_incidencias (
  id_comentario SERIAL PRIMARY KEY,
  id_incidencia INTEGER NOT NULL REFERENCES public.incidencias(id_incidencia) ON DELETE CASCADE,
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  texto_comentario TEXT NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_incidencia ON public.comentarios_incidencias (id_incidencia);

CREATE TABLE IF NOT EXISTS public.registros_llegada (
  id_registro SERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_llegada TIME NOT NULL,
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('A tiempo', 'Tarde')),
  registrado_por INTEGER NULL REFERENCES public.usuarios(id_usuario),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_salida TIME NULL,
  registrado_salida_por INTEGER NULL REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
  fecha_salida TIMESTAMPTZ NULL,
  tipo_salida VARCHAR(20) NULL CHECK (tipo_salida IS NULL OR tipo_salida IN ('Normal', 'Autorizada', 'Sin registro')),
  CONSTRAINT registros_llegada_estudiante_fecha_unique UNIQUE (id_estudiante, fecha)
);

CREATE INDEX IF NOT EXISTS idx_registros_llegada_fecha ON public.registros_llegada (fecha);
CREATE INDEX IF NOT EXISTS idx_registros_llegada_estudiante ON public.registros_llegada (id_estudiante);
CREATE INDEX IF NOT EXISTS idx_registros_llegada_estado ON public.registros_llegada (estado);
CREATE INDEX IF NOT EXISTS idx_registros_llegada_hora_salida ON public.registros_llegada (hora_salida) WHERE hora_salida IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registros_llegada_sin_salida ON public.registros_llegada (fecha, id_estudiante) WHERE hora_salida IS NULL;

CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
  id_config SERIAL PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descripcion TEXT NULL,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.configuracion_reincidencia (
  id_config_reincidencia SERIAL PRIMARY KEY,
  ventana_dias INTEGER NOT NULL DEFAULT 60,
  puntos_falta_leve INTEGER NOT NULL DEFAULT 1,
  puntos_falta_grave INTEGER NOT NULL DEFAULT 2,
  umbral_nivel_1 INTEGER NOT NULL DEFAULT 1,
  umbral_nivel_2 INTEGER NOT NULL DEFAULT 3,
  umbral_nivel_3 INTEGER NOT NULL DEFAULT 5,
  umbral_nivel_4 INTEGER NOT NULL DEFAULT 8,
  umbral_nivel_5 INTEGER NOT NULL DEFAULT 12,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_vigencia TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auditoria_logs (
  id_log SERIAL PRIMARY KEY,
  id_usuario INTEGER NULL REFERENCES public.usuarios(id_usuario),
  tabla_afectada VARCHAR(100) NOT NULL,
  id_registro INTEGER NOT NULL DEFAULT 0,
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores JSONB NULL,
  datos_nuevos JSONB NULL,
  descripcion_accion TEXT NULL,
  ip_address VARCHAR(50) NULL,
  user_agent TEXT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON public.auditoria_logs (tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON public.auditoria_logs (accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria_logs (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria_logs (id_usuario);

CREATE TABLE IF NOT EXISTS public.citas_padres (
  id_cita SERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  motivo VARCHAR(255) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN (
    'Pendiente', 'Confirmada', 'Reprogramada', 'Completada', 'No asistió', 'Cancelada'
  )),
  asistencia BOOLEAN DEFAULT NULL,
  llegada_tarde BOOLEAN DEFAULT NULL,
  hora_llegada_real TIME DEFAULT NULL,
  notas TEXT NULL,
  id_usuario_creador INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citas_padres_estudiante ON public.citas_padres (id_estudiante);
CREATE INDEX IF NOT EXISTS idx_citas_padres_fecha ON public.citas_padres (fecha);
CREATE INDEX IF NOT EXISTS idx_citas_padres_estado ON public.citas_padres (estado);
CREATE INDEX IF NOT EXISTS idx_citas_padres_usuario_creador ON public.citas_padres (id_usuario_creador);
CREATE INDEX IF NOT EXISTS idx_citas_padres_llegada_tarde ON public.citas_padres (llegada_tarde) WHERE llegada_tarde = TRUE;

CREATE TABLE IF NOT EXISTS public.padres_estudiantes (
  id_relacion SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  parentesco VARCHAR(50) DEFAULT 'Apoderado',
  es_principal BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id_usuario, id_estudiante)
);

CREATE INDEX IF NOT EXISTS idx_padres_estudiantes_usuario ON public.padres_estudiantes (id_usuario);
CREATE INDEX IF NOT EXISTS idx_padres_estudiantes_estudiante ON public.padres_estudiantes (id_estudiante);

CREATE TABLE IF NOT EXISTS public.app_sesiones (
  id_sesion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  id_usuario integer NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  rol text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_sesiones_token_hash ON public.app_sesiones (token_hash);
CREATE INDEX IF NOT EXISTS idx_app_sesiones_expires ON public.app_sesiones (expires_at);

CREATE TABLE IF NOT EXISTS public.tokens_recuperacion (
  id_token SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tokens_recuperacion_hash ON public.tokens_recuperacion (token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_recuperacion_usuario ON public.tokens_recuperacion (id_usuario);

CREATE OR REPLACE FUNCTION public.actualizar_fecha_cita_padre()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_cita_padre ON public.citas_padres;
CREATE TRIGGER trigger_actualizar_fecha_cita_padre
  BEFORE UPDATE ON public.citas_padres
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_fecha_cita_padre();

CREATE OR REPLACE FUNCTION public.actualizar_fecha_estudiante()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.fecha_actualizacion = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_estudiante ON public.estudiantes;
CREATE TRIGGER trigger_actualizar_fecha_estudiante
  BEFORE UPDATE ON public.estudiantes
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_fecha_estudiante();

-- 5) Helpers de sesión y auth
CREATE OR REPLACE FUNCTION public._sie_token_hash(p_token text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions AS $$
  SELECT encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public._sie_limpiar_sesiones_expiradas()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.app_sesiones WHERE expires_at < now();
$$;

CREATE OR REPLACE FUNCTION public._sie_validar_token(p_token text)
RETURNS TABLE(id_usuario integer, rol text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 32 THEN RETURN; END IF;
  RETURN QUERY
  SELECT s.id_usuario, s.rol
  FROM public.app_sesiones s
  WHERE s.token_hash = public._sie_token_hash(trim(p_token))
    AND s.expires_at > now()
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public._sie_es_staff(p_rol text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_rol IN ('Admin', 'Director', 'Supervisor');
$$;

CREATE OR REPLACE FUNCTION public.sie_request_token()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nullif(trim(coalesce(
    current_setting('request.headers', true)::json->>'x-sie-token',
    ''
  )), '');
$$;

CREATE OR REPLACE FUNCTION public.sie_sesion_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.rol FROM public._sie_validar_token(public.sie_request_token()) v LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sie_sesion_usuario_id()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id_usuario FROM public._sie_validar_token(public.sie_request_token()) v LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sie_tiene_sesion()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.sie_sesion_usuario_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.sie_es_staff_sesion()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public._sie_es_staff(public.sie_sesion_rol());
$$;

CREATE OR REPLACE FUNCTION public._sie_ids_desde_grados_asignados(p_grados jsonb)
RETURNS int[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_agg(DISTINCT x.id), ARRAY[]::int[])
  FROM (
    SELECT (jsonb_array_elements_text(
      CASE
        WHEN p_grados IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(p_grados) = 'array' THEN p_grados
        WHEN p_grados ? 'studentIds' THEN p_grados->'studentIds'
        WHEN p_grados ? 'estudiantes' THEN p_grados->'estudiantes'
        WHEN p_grados ? 'ids' THEN p_grados->'ids'
        WHEN p_grados ? 'id_estudiantes' THEN p_grados->'id_estudiantes'
        ELSE '[]'::jsonb
      END
    ))::int AS id
  ) x
  WHERE x.id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public._sie_ids_estudiantes_padre(p_uid int)
RETURNS int[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ids int[];
  v_grados jsonb;
BEGIN
  IF p_uid IS NULL THEN RETURN ARRAY[]::int[]; END IF;

  SELECT u.grados_asignados::jsonb INTO v_grados
  FROM public.usuarios u WHERE u.id_usuario = p_uid;

  v_ids := public._sie_ids_desde_grados_asignados(v_grados);

  IF to_regclass('public.padres_estudiantes') IS NOT NULL THEN
    SELECT coalesce(array_agg(DISTINCT id), ARRAY[]::int[]) INTO v_ids
    FROM (
      SELECT unnest(v_ids) AS id
      UNION
      SELECT pe.id_estudiante FROM public.padres_estudiantes pe WHERE pe.id_usuario = p_uid
    ) q;
  END IF;

  RETURN coalesce(v_ids, ARRAY[]::int[]);
END;
$$;

CREATE OR REPLACE FUNCTION public._sie_padre_puede_ver_estudiante_uid(p_uid int, p_id_estudiante int)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_uid IS NULL THEN RETURN false; END IF;
  RETURN p_id_estudiante = ANY(public._sie_ids_estudiantes_padre(p_uid));
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_padre_puede_ver_estudiante(p_id_estudiante integer)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.sie_sesion_rol() <> 'Padre' THEN RETURN false; END IF;
  RETURN public._sie_padre_puede_ver_estudiante_uid(public.sie_sesion_usuario_id(), p_id_estudiante);
END;
$$;

CREATE OR REPLACE FUNCTION public._sie_docente_puede_ver_estudiante(p_id_estudiante integer)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid int;
  v_classrooms jsonb;
  v_est public.estudiantes%ROWTYPE;
  c jsonb;
BEGIN
  IF public.sie_sesion_rol() IS DISTINCT FROM 'Docente' THEN
    RETURN false;
  END IF;
  v_uid := public.sie_sesion_usuario_id();
  IF v_uid IS NULL THEN RETURN false; END IF;

  SELECT u.grados_asignados::jsonb INTO v_classrooms
  FROM public.usuarios u WHERE u.id_usuario = v_uid;

  IF v_classrooms IS NULL OR v_classrooms->'classrooms' IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_est FROM public.estudiantes
  WHERE id_estudiante = p_id_estudiante AND activo = true;
  IF NOT FOUND THEN RETURN false; END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(v_classrooms->'classrooms')
  LOOP
    IF v_est.nivel_educativo::text = coalesce(c->>'level', '')
       AND v_est.grado = coalesce(c->>'grade', '')
       AND v_est.seccion = coalesce(c->>'section', '') THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._sie_student_json_basico(e public.estudiantes)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'id', e.id_estudiante, 'fullName', e.nombre_completo, 'grade', e.grado,
    'section', e.seccion, 'level', e.nivel_educativo, 'barcode', e.codigo_barras,
    'profilePhoto', e.foto_perfil, 'active', e.activo,
    'reincidenceLevel', 0, 'faultsLast60Days', 0
  );
$$;

CREATE OR REPLACE FUNCTION public._sie_student_json_tutor(e public.estudiantes)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT public._sie_student_json_basico(e) || jsonb_build_object(
    'contactPhone', e.telefono_contacto, 'emergencyPhone', e.telefono_emergencia
  );
$$;

CREATE OR REPLACE FUNCTION public._sie_student_json_completo(
  e public.estudiantes, p_nivel int DEFAULT 0, p_faltas bigint DEFAULT 0
)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT public._sie_student_json_basico(e) || jsonb_build_object(
    'reincidenceLevel', coalesce(p_nivel, 0), 'faultsLast60Days', coalesce(p_faltas, 0)::int,
    'contactPhone', e.telefono_contacto, 'contactEmail', e.email_contacto,
    'responsibleName', e.nombre_responsable,
    'responsibleRelationship', e.parentesco_responsable,
    'emergencyPhone', e.telefono_emergencia
  );
$$;

-- 6) Password / login
CREATE OR REPLACE FUNCTION public.validar_password(p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_password_hash text;
BEGIN
  SELECT password_hash INTO v_password_hash
  FROM public.usuarios
  WHERE username = trim(p_username) AND activo = true
  LIMIT 1;

  IF v_password_hash IS NULL THEN
    RETURN false;
  END IF;

  IF v_password_hash LIKE '$2%' THEN
    RETURN v_password_hash = extensions.crypt(p_password, v_password_hash);
  END IF;

  RETURN v_password_hash = p_password;
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_iniciar_sesion(p_username text, p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_user public.usuarios%ROWTYPE;
  v_token text;
  v_duracion interval;
  v_nuevos_intentos int;
BEGIN
  PERFORM public._sie_limpiar_sesiones_expiradas();
  SELECT * INTO v_user FROM public.usuarios
  WHERE username = trim(p_username) AND activo = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuario o contraseña incorrectos');
  END IF;
  IF v_user.bloqueado_hasta IS NOT NULL AND v_user.bloqueado_hasta > now() THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Usuario bloqueado hasta ' || to_char(v_user.bloqueado_hasta AT TIME ZONE 'America/Lima', 'DD/MM/YYYY HH24:MI'));
  END IF;
  IF v_user.intentos_fallidos >= 5 THEN
    UPDATE public.usuarios SET bloqueado_hasta = now() + interval '1 hour' WHERE id_usuario = v_user.id_usuario;
    RETURN jsonb_build_object('ok', false, 'error', 'Usuario bloqueado por múltiples intentos fallidos. Intente más tarde.');
  END IF;
  IF NOT public.validar_password(trim(p_username), p_password) THEN
    v_nuevos_intentos := coalesce(v_user.intentos_fallidos, 0) + 1;
    UPDATE public.usuarios SET intentos_fallidos = v_nuevos_intentos WHERE id_usuario = v_user.id_usuario;
    RETURN jsonb_build_object('ok', false, 'error', 'Usuario o contraseña incorrectos');
  END IF;
  UPDATE public.usuarios SET ultimo_acceso = now(), intentos_fallidos = 0 WHERE id_usuario = v_user.id_usuario;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_duracion := CASE v_user.rol::text
    WHEN 'Tutor' THEN interval '15 minutes'
    WHEN 'Docente' THEN interval '15 minutes'
    WHEN 'Padre' THEN interval '15 minutes'
    ELSE interval '30 minutes' END;
  INSERT INTO public.app_sesiones (token_hash, id_usuario, rol, expires_at)
  VALUES (public._sie_token_hash(v_token), v_user.id_usuario, v_user.rol::text, now() + v_duracion);
  RETURN jsonb_build_object(
    'ok', true, 'token', v_token,
    'expiresInMs', (EXTRACT(EPOCH FROM v_duracion) * 1000)::bigint,
    'user', jsonb_build_object(
      'id', v_user.id_usuario, 'username', v_user.username, 'fullName', v_user.nombre_completo,
      'email', v_user.email, 'role', v_user.rol::text, 'active', v_user.activo,
      'gradosAsignados', v_user.grados_asignados,
      'cambioPasswordObligatorio', v_user.cambio_password_obligatorio
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_cerrar_sesion(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.app_sesiones WHERE token_hash = public._sie_token_hash(trim(p_token));
  PERFORM public._sie_limpiar_sesiones_expiradas();
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_renovar_sesion(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text; v_id int; v_duracion interval;
BEGIN
  PERFORM public._sie_limpiar_sesiones_expiradas();
  SELECT s.rol, s.id_usuario INTO v_rol, v_id FROM public._sie_validar_token(p_token) s;
  IF v_id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  v_duracion := CASE v_rol
    WHEN 'Tutor' THEN interval '15 minutes'
    WHEN 'Docente' THEN interval '15 minutes'
    WHEN 'Padre' THEN interval '15 minutes'
    ELSE interval '30 minutes' END;
  UPDATE public.app_sesiones SET expires_at = now() + v_duracion
  WHERE token_hash = public._sie_token_hash(trim(p_token));
  RETURN jsonb_build_object('ok', true, 'expiresInMs', (EXTRACT(EPOCH FROM v_duracion) * 1000)::bigint);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_solicitar_reset_password(p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_user public.usuarios%ROWTYPE; v_token text; v_hash text;
BEGIN
  SELECT * INTO v_user FROM public.usuarios WHERE email = trim(p_email) AND activo = true LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true); END IF;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  INSERT INTO public.tokens_recuperacion (id_usuario, token_hash, fecha_expiracion)
  VALUES (v_user.id_usuario, v_hash, now() + interval '24 hours');
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_cambiar_password(p_token text, p_new_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_uid int;
BEGIN
  SELECT id_usuario INTO v_uid FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Sesión inválida'); END IF;
  IF length(trim(p_new_password)) < 6 THEN RETURN jsonb_build_object('ok', false, 'error', 'Contraseña muy corta'); END IF;
  UPDATE public.usuarios SET password_hash = extensions.crypt(trim(p_new_password), extensions.gen_salt('bf')),
    cambio_password_obligatorio = false WHERE id_usuario = v_uid;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- 7) Reincidencia
CREATE OR REPLACE FUNCTION public.calcular_nivel_reincidencia(
    p_id_estudiante INTEGER,
    p_fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_config RECORD;
    v_puntos_totales INTEGER := 0;
    v_nivel INTEGER := 0;
    v_fecha_inicio TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT * INTO v_config
    FROM public.configuracion_reincidencia
    WHERE activo = TRUE
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    v_fecha_inicio := p_fecha_registro - (v_config.ventana_dias || ' days')::INTERVAL;

    SELECT COALESCE(SUM(cf.puntos_reincidencia), 0) INTO v_puntos_totales
    FROM public.incidencias i
    INNER JOIN public.catalogo_faltas cf ON i.id_falta = cf.id_falta
    WHERE i.id_estudiante = p_id_estudiante
        AND i.estado = 'Activa'
        AND i.fecha_hora_registro >= v_fecha_inicio
        AND i.fecha_hora_registro < p_fecha_registro;

    IF v_puntos_totales >= v_config.umbral_nivel_5 THEN
        v_nivel := 5;
    ELSIF v_puntos_totales >= v_config.umbral_nivel_4 THEN
        v_nivel := 4;
    ELSIF v_puntos_totales >= v_config.umbral_nivel_3 THEN
        v_nivel := 3;
    ELSIF v_puntos_totales >= v_config.umbral_nivel_2 THEN
        v_nivel := 2;
    ELSIF v_puntos_totales >= v_config.umbral_nivel_1 THEN
        v_nivel := 1;
    ELSE
        v_nivel := 0;
    END IF;

    RETURN v_nivel;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_calcular_nivel_reincidencia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.nivel_reincidencia := public.calcular_nivel_reincidencia(
    NEW.id_estudiante,
    coalesce(NEW.fecha_hora_registro, now())
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_incidencias_calcular_nivel ON public.incidencias;
CREATE TRIGGER trigger_incidencias_calcular_nivel
  BEFORE INSERT ON public.incidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calcular_nivel_reincidencia();

-- 4) Vistas (tras calcular_nivel_reincidencia)
CREATE OR REPLACE VIEW public.v_estudiantes_nivel_actual
WITH (security_invoker = true)
AS
SELECT
  e.id_estudiante,
  public.calcular_nivel_reincidencia(e.id_estudiante, now()) AS nivel_actual,
  (
    SELECT count(*)::bigint
    FROM public.incidencias i
    WHERE i.id_estudiante = e.id_estudiante
      AND i.estado = 'Activa'
      AND i.fecha_hora_registro >= now() - coalesce(
        (SELECT (ventana_dias || ' days')::interval
         FROM public.configuracion_reincidencia
         WHERE activo = true
         LIMIT 1),
        interval '60 days'
      )
  ) AS total_faltas_60_dias
FROM public.estudiantes e;

CREATE OR REPLACE VIEW public.v_dashboard_ejecutivo
WITH (security_invoker = true)
AS
SELECT
  (
    SELECT count(*)::bigint
    FROM public.incidencias i
    WHERE i.estado = 'Activa'
      AND i.fecha_hora_registro >= date_trunc('month', timezone('America/Lima', now()))
      AND i.fecha_hora_registro < date_trunc('month', timezone('America/Lima', now())) + interval '1 month'
  ) AS total_incidencias_mes,
  (
    SELECT count(DISTINCT i.id_estudiante)::bigint
    FROM public.incidencias i
    WHERE i.estado = 'Activa'
      AND i.fecha_hora_registro >= date_trunc('month', timezone('America/Lima', now()))
      AND i.fecha_hora_registro < date_trunc('month', timezone('America/Lima', now())) + interval '1 month'
  ) AS estudiantes_afectados_mes;

-- 8) RPCs estudiantes
CREATE OR REPLACE FUNCTION public._sie_fold_busqueda(p_texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    translate(
      coalesce(p_texto, ''),
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public._sie_estudiante_coincide_busqueda(
  p_nombre text,
  p_codigo text,
  p_query text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  WITH q AS (
    SELECT nullif(trim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')), '') AS texto
  ),
  digit_q AS (
    SELECT nullif(regexp_replace((SELECT texto FROM q), '\D', '', 'g'), '') AS d
  ),
  tokens AS (
    SELECT unnest(string_to_array((SELECT texto FROM q), ' ')) AS tok
  ),
  tokens_validos AS (
    SELECT tok
    FROM tokens
    WHERE length(tok) >= 2
       OR length(regexp_replace(tok, '\D', '', 'g')) >= 2
  ),
  codigo_digits AS (
    SELECT nullif(regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g'), '') AS d
  ),
  nombre_fold AS (
    SELECT public._sie_fold_busqueda(p_nombre) AS n
  ),
  codigo_fold AS (
    SELECT public._sie_fold_busqueda(p_codigo) AS c
  ),
  query_fold AS (
    SELECT public._sie_fold_busqueda((SELECT texto FROM q)) AS qf
  ),
  phrase_pattern AS (
    SELECT '%' || replace((SELECT texto FROM q), ' ', '%') || '%' AS pat
  )
  SELECT
    (SELECT texto FROM q) IS NOT NULL
    AND (
      coalesce(p_nombre, '') ILIKE (SELECT pat FROM phrase_pattern)
      OR (SELECT c FROM codigo_fold) LIKE '%' || (SELECT qf FROM query_fold) || '%'
      OR (SELECT n FROM nombre_fold) LIKE '%' || (SELECT qf FROM query_fold) || '%'
      OR coalesce(p_codigo, '') ILIKE '%' || (SELECT texto FROM q) || '%'
      OR coalesce(p_nombre, '') ILIKE '%' || (SELECT texto FROM q) || '%'
      OR (
        length(coalesce((SELECT d FROM digit_q), '')) >= 2
        AND coalesce((SELECT d FROM codigo_digits), '') ILIKE '%' || (SELECT d FROM digit_q) || '%'
      )
      OR (
        length(coalesce((SELECT d FROM digit_q), '')) >= 2
        AND ltrim(coalesce((SELECT d FROM codigo_digits), ''), '0')
          ILIKE '%' || ltrim((SELECT d FROM digit_q), '0') || '%'
      )
      OR (
        EXISTS (SELECT 1 FROM tokens_validos)
        AND NOT EXISTS (
          SELECT 1
          FROM tokens_validos tv
          WHERE public._sie_fold_busqueda(p_nombre) NOT LIKE '%' || public._sie_fold_busqueda(tv.tok) || '%'
            AND public._sie_fold_busqueda(p_codigo) NOT LIKE '%' || public._sie_fold_busqueda(tv.tok) || '%'
            AND coalesce((SELECT d FROM codigo_digits), '') NOT ILIKE '%' || regexp_replace(tv.tok, '\D', '', 'g') || '%'
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.sie_buscar_estudiante_carnet(p_token text, p_codigo text, p_skip_reincidencia boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_rol text;
  v_est public.estudiantes%ROWTYPE;
  v_nivel int := 0;
  v_faltas int := 0;
  v_codigo text := trim(p_codigo);
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL THEN RETURN jsonb_build_object('error', 'Sesión inválida o expirada'); END IF;
  IF v_rol NOT IN ('Tutor', 'Docente', 'Admin', 'Director', 'Supervisor') THEN
    RETURN jsonb_build_object('error', 'No autorizado');
  END IF;

  SELECT * INTO v_est FROM public.estudiantes
  WHERE activo = true
    AND (
      codigo_barras = v_codigo
      OR regexp_replace(codigo_barras, '\D', '', 'g') = regexp_replace(v_codigo, '\D', '', 'g')
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('student', null, 'error', 'Estudiante no encontrado');
  END IF;

  IF v_rol = 'Docente' THEN
    IF NOT public._sie_docente_puede_ver_estudiante(v_est.id_estudiante) THEN
      RETURN jsonb_build_object('student', null, 'error', 'El estudiante no pertenece a sus salones asignados');
    END IF;
    IF NOT p_skip_reincidencia THEN
      SELECT coalesce(n.nivel_actual, 0), coalesce(n.total_faltas_60_dias, 0) INTO v_nivel, v_faltas
      FROM public.v_estudiantes_nivel_actual n WHERE n.id_estudiante = v_est.id_estudiante;
    END IF;
    RETURN jsonb_build_object('student', public._sie_student_json_completo(v_est, v_nivel, v_faltas), 'error', null);
  END IF;

  IF v_rol = 'Tutor' THEN
    RETURN jsonb_build_object('student', public._sie_student_json_tutor(v_est), 'error', null);
  END IF;

  IF NOT p_skip_reincidencia THEN
    SELECT coalesce(n.nivel_actual, 0), coalesce(n.total_faltas_60_dias, 0) INTO v_nivel, v_faltas
    FROM public.v_estudiantes_nivel_actual n WHERE n.id_estudiante = v_est.id_estudiante;
  END IF;
  RETURN jsonb_build_object('student', public._sie_student_json_completo(v_est, v_nivel, v_faltas), 'error', null);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_buscar_estudiantes_nombre(p_token text, p_query text, p_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_rol text;
  v_lim int;
  v_result jsonb;
  v_query text;
  v_uid int;
  v_classrooms jsonb;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL THEN
    RETURN jsonb_build_object('error', 'Sesión inválida o expirada', 'students', '[]'::jsonb);
  END IF;

  v_query := trim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'));
  IF length(v_query) < 2 THEN
    RETURN jsonb_build_object('students', '[]'::jsonb, 'error', null);
  END IF;

  IF v_rol = 'Docente' THEN
    v_uid := (SELECT id_usuario FROM public._sie_validar_token(p_token) LIMIT 1);
    SELECT u.grados_asignados::jsonb INTO v_classrooms FROM public.usuarios u WHERE u.id_usuario = v_uid;
    v_lim := least(greatest(coalesce(p_limit, 12), 1), 12);
    SELECT coalesce(jsonb_agg(public._sie_student_json_completo(e, coalesce(n.nivel_actual, 0), coalesce(n.total_faltas_60_dias, 0))), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT e.*
      FROM public.estudiantes e
      WHERE e.activo = true
        AND public._sie_estudiante_coincide_busqueda(e.nombre_completo, e.codigo_barras, v_query)
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(coalesce(v_classrooms->'classrooms', '[]'::jsonb)) AS c
          WHERE e.nivel_educativo::text = coalesce(c->>'level', '')
            AND e.grado = coalesce(c->>'grade', '')
            AND e.seccion = coalesce(c->>'section', '')
        )
      ORDER BY e.nombre_completo
      LIMIT v_lim
    ) e
    LEFT JOIN public.v_estudiantes_nivel_actual n ON n.id_estudiante = e.id_estudiante;
    RETURN jsonb_build_object('students', v_result, 'error', null);
  END IF;

  IF v_rol = 'Tutor' THEN
    v_lim := least(greatest(coalesce(p_limit, 20), 1), 50);
    SELECT coalesce(jsonb_agg(public._sie_student_json_basico(e)), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT e.*
      FROM public.estudiantes e
      WHERE e.activo = true
        AND public._sie_estudiante_coincide_busqueda(e.nombre_completo, e.codigo_barras, v_query)
      ORDER BY
        CASE
          WHEN e.nombre_completo ILIKE '%' || replace(v_query, ' ', '%') || '%' THEN 0
          WHEN public._sie_fold_busqueda(e.nombre_completo)
            LIKE '%' || public._sie_fold_busqueda(v_query) || '%' THEN 1
          ELSE 2
        END,
        (regexp_split_to_array(trim(e.nombre_completo), '\s+'))[
          array_length(regexp_split_to_array(trim(e.nombre_completo), '\s+'), 1)
        ],
        e.grado,
        e.seccion,
        e.nombre_completo
      LIMIT v_lim
    ) e;
    RETURN jsonb_build_object('students', v_result, 'error', null);
  END IF;

  IF public._sie_es_staff(v_rol) THEN
    v_lim := least(greatest(coalesce(p_limit, 20), 1), 50);
    SELECT coalesce(
      jsonb_agg(
        public._sie_student_json_completo(
          e,
          coalesce(n.nivel_actual, 0),
          coalesce(n.total_faltas_60_dias, 0)
        )
      ),
      '[]'::jsonb
    )
    INTO v_result
    FROM (
      SELECT e.*
      FROM public.estudiantes e
      WHERE e.activo = true
        AND public._sie_estudiante_coincide_busqueda(e.nombre_completo, e.codigo_barras, v_query)
      ORDER BY
        CASE
          WHEN e.nombre_completo ILIKE '%' || replace(v_query, ' ', '%') || '%' THEN 0
          WHEN public._sie_fold_busqueda(e.nombre_completo)
            LIKE '%' || public._sie_fold_busqueda(v_query) || '%' THEN 1
          ELSE 2
        END,
        (regexp_split_to_array(trim(e.nombre_completo), '\s+'))[
          array_length(regexp_split_to_array(trim(e.nombre_completo), '\s+'), 1)
        ],
        e.grado,
        e.seccion,
        e.nombre_completo
      LIMIT v_lim
    ) e
    LEFT JOIN public.v_estudiantes_nivel_actual n ON n.id_estudiante = e.id_estudiante;
    RETURN jsonb_build_object('students', v_result, 'error', null);
  END IF;

  RETURN jsonb_build_object('error', 'No autorizado', 'students', '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_lista_estudiantes(p_token text, p_filtros jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_rol text;
  v_busqueda text := nullif(trim(p_filtros->>'search'), '');
  v_grado text := nullif(trim(p_filtros->>'grade'), '');
  v_seccion text := nullif(trim(p_filtros->>'section'), '');
  v_nivel text := nullif(trim(p_filtros->>'level'), '');
  v_activo boolean := CASE WHEN p_filtros ? 'active' THEN (p_filtros->>'active')::boolean ELSE null END;
  v_fetch_all boolean := coalesce((p_filtros->>'fetchAll')::boolean, false);
  v_limit int := CASE
    WHEN v_fetch_all THEN NULL
    WHEN p_filtros ? 'limit' THEN greatest((p_filtros->>'limit')::int, 1)
    ELSE 10
  END;
  v_offset int := greatest(coalesce((p_filtros->>'offset')::int, 0), 0);
  v_ids int[];
  v_result jsonb;
  v_total bigint;
  v_stats jsonb;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Sesión inválida o expirada',
      'students', '[]'::jsonb,
      'total', 0,
      'stats', jsonb_build_object('sinIncidencias', 0, 'nivelModerado', 0, 'nivelAlto', 0)
    );
  END IF;
  IF NOT public._sie_es_staff(v_rol) THEN
    RETURN jsonb_build_object(
      'error', 'No autorizado',
      'students', '[]'::jsonb,
      'total', 0,
      'stats', jsonb_build_object('sinIncidencias', 0, 'nivelModerado', 0, 'nivelAlto', 0)
    );
  END IF;

  IF v_busqueda IS NOT NULL THEN
    SELECT array_agg(DISTINCT id_estudiante) INTO v_ids
    FROM (
      SELECT id_estudiante FROM public.estudiantes WHERE nombre_completo ILIKE '%' || v_busqueda || '%'
      UNION
      SELECT id_estudiante FROM public.estudiantes WHERE codigo_barras ILIKE '%' || v_busqueda || '%'
    ) q;
    IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
      RETURN jsonb_build_object(
        'students', '[]'::jsonb,
        'total', 0,
        'stats', jsonb_build_object('sinIncidencias', 0, 'nivelModerado', 0, 'nivelAlto', 0),
        'error', null
      );
    END IF;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.estudiantes e
  WHERE (v_ids IS NULL OR e.id_estudiante = ANY(v_ids))
    AND (v_grado IS NULL OR e.grado = v_grado)
    AND (v_seccion IS NULL OR e.seccion = v_seccion)
    AND (v_nivel IS NULL OR e.nivel_educativo::text = v_nivel)
    AND (v_activo IS NULL OR e.activo = v_activo);

  SELECT jsonb_build_object(
    'sinIncidencias', count(*) FILTER (WHERE coalesce(n.nivel_actual, 0) = 0),
    'nivelModerado', count(*) FILTER (WHERE coalesce(n.nivel_actual, 0) BETWEEN 1 AND 2),
    'nivelAlto', count(*) FILTER (WHERE coalesce(n.nivel_actual, 0) >= 3)
  )
  INTO v_stats
  FROM public.estudiantes e
  LEFT JOIN public.v_estudiantes_nivel_actual n ON n.id_estudiante = e.id_estudiante
  WHERE (v_ids IS NULL OR e.id_estudiante = ANY(v_ids))
    AND (v_grado IS NULL OR e.grado = v_grado)
    AND (v_seccion IS NULL OR e.seccion = v_seccion)
    AND (v_nivel IS NULL OR e.nivel_educativo::text = v_nivel)
    AND (v_activo IS NULL OR e.activo = v_activo);

  SELECT coalesce(jsonb_agg(
    public._sie_student_json_completo(
      e,
      coalesce(n.nivel_actual, 0),
      coalesce(n.total_faltas_60_dias, 0)
    ) ORDER BY e.nombre_completo
  ), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT e.*
    FROM public.estudiantes e
    WHERE (v_ids IS NULL OR e.id_estudiante = ANY(v_ids))
      AND (v_grado IS NULL OR e.grado = v_grado)
      AND (v_seccion IS NULL OR e.seccion = v_seccion)
      AND (v_nivel IS NULL OR e.nivel_educativo::text = v_nivel)
      AND (v_activo IS NULL OR e.activo = v_activo)
    ORDER BY e.nombre_completo
    LIMIT v_limit OFFSET CASE WHEN v_fetch_all THEN 0 ELSE v_offset END
  ) e
  LEFT JOIN public.v_estudiantes_nivel_actual n ON n.id_estudiante = e.id_estudiante;

  RETURN jsonb_build_object(
    'students', v_result,
    'total', v_total,
    'stats', coalesce(v_stats, jsonb_build_object('sinIncidencias', 0, 'nivelModerado', 0, 'nivelAlto', 0)),
    'limit', coalesce(v_limit, v_total),
    'offset', CASE WHEN v_fetch_all THEN 0 ELSE v_offset END,
    'error', null
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_estudiante_por_id(p_token text, p_id int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text; v_uid int; v_est public.estudiantes%ROWTYPE; v_nivel int := 0; v_faltas int := 0;
BEGIN
  SELECT rol, id_usuario INTO v_rol, v_uid FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL THEN RETURN jsonb_build_object('error', 'Sesión inválida o expirada'); END IF;
  IF v_rol = 'Padre' THEN
    IF NOT public._sie_padre_puede_ver_estudiante_uid(v_uid, p_id) THEN
      RETURN jsonb_build_object('error', 'No autorizado', 'student', null);
    END IF;
  ELSIF NOT public._sie_es_staff(v_rol) THEN
    RETURN jsonb_build_object('error', 'No autorizado', 'student', null);
  END IF;
  SELECT * INTO v_est FROM public.estudiantes WHERE id_estudiante = p_id LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('student', null, 'error', 'Estudiante no encontrado'); END IF;
  SELECT coalesce(n.nivel_actual, 0), coalesce(n.total_faltas_60_dias, 0) INTO v_nivel, v_faltas
  FROM public.v_estudiantes_nivel_actual n WHERE n.id_estudiante = p_id;
  RETURN jsonb_build_object('student', public._sie_student_json_completo(v_est, v_nivel, v_faltas), 'error', null);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_padre_mis_estudiantes(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text; v_uid int; v_result jsonb; v_ids int[];
BEGIN
  SELECT rol, id_usuario INTO v_rol, v_uid FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL OR v_rol <> 'Padre' THEN RETURN jsonb_build_object('error', 'No autorizado', 'students', '[]'::jsonb); END IF;

  v_ids := public._sie_ids_estudiantes_padre(v_uid);
  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('students', '[]'::jsonb, 'error', null);
  END IF;

  SELECT coalesce(jsonb_agg(public._sie_student_json_completo(e, coalesce(n.nivel_actual, 0), coalesce(n.total_faltas_60_dias, 0)) ORDER BY e.nombre_completo), '[]'::jsonb)
  INTO v_result FROM public.estudiantes e
  LEFT JOIN public.v_estudiantes_nivel_actual n ON n.id_estudiante = e.id_estudiante
  WHERE e.activo = true AND e.id_estudiante = ANY(v_ids);

  RETURN jsonb_build_object('students', v_result, 'error', null);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_crear_estudiante(p_token text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text; v_row public.estudiantes%ROWTYPE;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL OR NOT public._sie_es_staff(v_rol) THEN RETURN jsonb_build_object('error', 'No autorizado'); END IF;
  INSERT INTO public.estudiantes (codigo_barras, nombre_completo, grado, seccion, nivel_educativo, foto_perfil,
    telefono_contacto, email_contacto, nombre_responsable, parentesco_responsable, telefono_emergencia)
  VALUES (p_payload->>'codigo_barras', p_payload->>'nombre_completo', p_payload->>'grado', p_payload->>'seccion',
    nullif(p_payload->>'nivel_educativo', '')::public.nivel_educativo, nullif(p_payload->>'foto_perfil', ''),
    nullif(p_payload->>'telefono_contacto', ''), nullif(p_payload->>'email_contacto', ''),
    nullif(p_payload->>'nombre_responsable', ''), nullif(p_payload->>'parentesco_responsable', ''),
    nullif(p_payload->>'telefono_emergencia', '')) RETURNING * INTO v_row;
  RETURN jsonb_build_object('student', public._sie_student_json_completo(v_row, 0, 0), 'error', null);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_actualizar_estudiante(p_token text, p_id int, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL OR NOT public._sie_es_staff(v_rol) THEN RETURN jsonb_build_object('ok', false, 'error', 'No autorizado'); END IF;
  UPDATE public.estudiantes SET
    nombre_completo = coalesce(p_payload->>'nombre_completo', nombre_completo),
    grado = coalesce(p_payload->>'grado', grado), seccion = coalesce(p_payload->>'seccion', seccion),
    nivel_educativo = coalesce(nullif(p_payload->>'nivel_educativo', '')::public.nivel_educativo, nivel_educativo),
    foto_perfil = CASE WHEN p_payload ? 'foto_perfil' THEN nullif(p_payload->>'foto_perfil', '') ELSE foto_perfil END,
    activo = coalesce((p_payload->>'activo')::boolean, activo),
    telefono_contacto = CASE WHEN p_payload ? 'telefono_contacto' THEN nullif(p_payload->>'telefono_contacto', '') ELSE telefono_contacto END,
    email_contacto = CASE WHEN p_payload ? 'email_contacto' THEN nullif(p_payload->>'email_contacto', '') ELSE email_contacto END,
    nombre_responsable = CASE WHEN p_payload ? 'nombre_responsable' THEN nullif(p_payload->>'nombre_responsable', '') ELSE nombre_responsable END,
    parentesco_responsable = CASE WHEN p_payload ? 'parentesco_responsable' THEN nullif(p_payload->>'parentesco_responsable', '') ELSE parentesco_responsable END,
    telefono_emergencia = CASE WHEN p_payload ? 'telefono_emergencia' THEN nullif(p_payload->>'telefono_emergencia', '') ELSE telefono_emergencia END
  WHERE id_estudiante = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Estudiante no encontrado'); END IF;
  RETURN jsonb_build_object('ok', true, 'error', null);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- 9) Portal padres / límites llegada
CREATE OR REPLACE FUNCTION public._sie_config_hora(p_clave text, p_default text DEFAULT '08:00')
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT left(
    coalesce(
      (SELECT valor::text FROM public.configuracion_sistema WHERE clave = p_clave LIMIT 1),
      p_default
    ),
    5
  );
$$;

CREATE OR REPLACE FUNCTION public._sie_hora_limite_por_nivel(p_nivel text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(p_nivel, '')) LIKE '%prim%'
      THEN public._sie_config_hora('hora_limite_llegada_primaria', public._sie_config_hora('hora_limite_llegada', '08:00'))
    WHEN lower(coalesce(p_nivel, '')) LIKE '%sec%'
      THEN public._sie_config_hora('hora_limite_llegada_secundaria', public._sie_config_hora('hora_limite_llegada', '08:00'))
    ELSE public._sie_config_hora('hora_limite_llegada', '08:00')
  END;
$$;

CREATE OR REPLACE FUNCTION public._sie_estado_llegada(p_hora text, p_nivel text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN left(coalesce(p_hora, ''), 5) <= public._sie_hora_limite_por_nivel(p_nivel) THEN 'A tiempo'
    ELSE 'Tarde'
  END;
$$;

CREATE OR REPLACE FUNCTION public.limites_llegada_publicos()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'general', public._sie_config_hora('hora_limite_llegada', '08:00'),
    'primaria', public._sie_config_hora(
      'hora_limite_llegada_primaria',
      public._sie_config_hora('hora_limite_llegada', '08:00')
    ),
    'secundaria', public._sie_config_hora(
      'hora_limite_llegada_secundaria',
      public._sie_config_hora('hora_limite_llegada', '08:00')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.buscar_asistencia_por_dni(p_dni text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
  v_today date := (timezone('America/Lima', now()))::date;
  v_since date := v_today - 13;
  v_arrival_today jsonb;
  v_recent jsonb;
BEGIN
  SELECT
    id_estudiante,
    nombre_completo,
    grado,
    seccion,
    nivel_educativo,
    foto_perfil,
    codigo_barras
  INTO v_student
  FROM public.estudiantes
  WHERE codigo_barras = trim(p_dni)
    AND activo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_build_object(
    'id', id_registro,
    'studentId', id_estudiante,
    'date', fecha,
    'arrivalTime', left(hora_llegada::text, 5),
    'status', public._sie_estado_llegada(hora_llegada::text, v_student.nivel_educativo::text)
  )
  INTO v_arrival_today
  FROM public.registros_llegada
  WHERE id_estudiante = v_student.id_estudiante
    AND fecha = v_today
  ORDER BY hora_llegada ASC
  LIMIT 1;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id_registro,
        'studentId', id_estudiante,
        'date', fecha,
        'arrivalTime', left(hora_llegada::text, 5),
        'status', public._sie_estado_llegada(hora_llegada::text, v_student.nivel_educativo::text)
      )
      ORDER BY fecha DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent
  FROM (
    SELECT id_registro, id_estudiante, fecha, hora_llegada
    FROM public.registros_llegada
    WHERE id_estudiante = v_student.id_estudiante
      AND fecha >= v_since
    ORDER BY fecha DESC
    LIMIT 14
  ) r;

  RETURN jsonb_build_object(
    'found', true,
    'student', jsonb_build_object(
      'id', v_student.id_estudiante,
      'fullName', v_student.nombre_completo,
      'grade', v_student.grado,
      'section', v_student.seccion,
      'level', v_student.nivel_educativo,
      'barcode', v_student.codigo_barras,
      'profilePhoto', v_student.foto_perfil,
      'active', true
    ),
    'arrivalToday', v_arrival_today,
    'recentArrivals', v_recent,
    'arrivalLimits', public.limites_llegada_publicos()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.asistencia_mes_por_estudiante(
  p_student_id integer,
  p_year integer,
  p_month integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel text;
BEGIN
  IF p_student_id IS NULL OR p_year IS NULL OR p_month IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF p_month < 1 OR p_month > 12 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT nivel_educativo::text INTO v_nivel
  FROM public.estudiantes
  WHERE id_estudiante = p_student_id
  LIMIT 1;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id_registro,
          'studentId', id_estudiante,
          'date', fecha,
          'arrivalTime', left(hora_llegada::text, 5),
          'status', public._sie_estado_llegada(hora_llegada::text, v_nivel)
        )
        ORDER BY fecha ASC
      )
      FROM public.registros_llegada
      WHERE id_estudiante = p_student_id
        AND fecha >= make_date(p_year, p_month, 1)
        AND fecha < (make_date(p_year, p_month, 1) + interval '1 month')::date
    ),
    '[]'::jsonb
  );
END;
$$;

-- 10) Evidencias
CREATE OR REPLACE FUNCTION public.insertar_evidencia(
  p_id_incidencia integer,
  p_ruta_archivo text,
  p_nombre_original text,
  p_nombre_archivo text,
  p_tamano_bytes integer,
  p_tipo_mime text,
  p_id_usuario_subida integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rol text;
  v_row public.evidencias_fotograficas%ROWTYPE;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(public.sie_request_token()) LIMIT 1;
  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'Sesión inválida o expirada';
  END IF;
  IF v_rol NOT IN ('Admin', 'Director', 'Supervisor', 'Docente') THEN
    RAISE EXCEPTION 'No autorizado para subir evidencia';
  END IF;

  INSERT INTO public.evidencias_fotograficas (
    id_incidencia, ruta_archivo, nombre_original, nombre_archivo,
    tamano_bytes, tipo_mime, id_usuario_subida, fecha_subida, marca_agua_aplicada
  ) VALUES (
    p_id_incidencia, p_ruta_archivo, p_nombre_original, p_nombre_archivo,
    p_tamano_bytes, p_tipo_mime, p_id_usuario_subida, now(), false
  ) RETURNING * INTO v_row;

  UPDATE public.incidencias
  SET estado_evidencia = 'Con evidencia',
      cantidad_fotos = coalesce(cantidad_fotos, 0) + 1,
      id_usuario_carga_foto = p_id_usuario_subida,
      fecha_hora_carga_foto = now()
  WHERE id_incidencia = p_id_incidencia;

  RETURN to_jsonb(v_row);
END;
$$;

-- 11) Auditoría
CREATE OR REPLACE FUNCTION public.fn_sie_auditoria_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id integer;
  v_id_registro integer;
BEGIN
  BEGIN
    v_usuario_id := public.sie_sesion_usuario_id();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_id_registro := COALESCE(
      NULLIF(to_jsonb(OLD)->>'id_incidencia', '')::integer,
      NULLIF(to_jsonb(OLD)->>'id_estudiante', '')::integer,
      NULLIF(to_jsonb(OLD)->>'id_registro', '')::integer,
      NULLIF(to_jsonb(OLD)->>'id_log', '')::integer,
      0
    );
    INSERT INTO public.auditoria_logs (
      tabla_afectada, accion, datos_anteriores, datos_nuevos,
      id_registro, id_usuario, fecha_hora
    ) VALUES (
      TG_TABLE_NAME::text, 'DELETE', to_jsonb(OLD), NULL,
      v_id_registro, v_usuario_id, now()
    );
    RETURN OLD;
  END IF;

  v_id_registro := COALESCE(
    NULLIF(to_jsonb(NEW)->>'id_incidencia', '')::integer,
    NULLIF(to_jsonb(NEW)->>'id_estudiante', '')::integer,
    NULLIF(to_jsonb(NEW)->>'id_registro', '')::integer,
    NULLIF(to_jsonb(NEW)->>'id_log', '')::integer,
    0
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditoria_logs (
      tabla_afectada, accion, datos_anteriores, datos_nuevos,
      id_registro, id_usuario, fecha_hora
    ) VALUES (
      TG_TABLE_NAME::text, 'INSERT', NULL, to_jsonb(NEW),
      v_id_registro, v_usuario_id, now()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.auditoria_logs (
      tabla_afectada, accion, datos_anteriores, datos_nuevos,
      id_registro, id_usuario, fecha_hora
    ) VALUES (
      TG_TABLE_NAME::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW),
      v_id_registro, v_usuario_id, now()
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

ALTER FUNCTION public.fn_sie_auditoria_trigger() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.fn_sie_auditoria_trigger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_sie_auditoria_trigger() TO postgres, service_role;

DROP TRIGGER IF EXISTS trg_auditoria_incidencias ON public.incidencias;
CREATE TRIGGER trg_auditoria_incidencias
  AFTER INSERT OR UPDATE OR DELETE ON public.incidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sie_auditoria_trigger();

DROP TRIGGER IF EXISTS trg_auditoria_registros_llegada ON public.registros_llegada;
CREATE TRIGGER trg_auditoria_registros_llegada
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_llegada
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sie_auditoria_trigger();

ALTER TABLE public.auditoria_logs NO FORCE ROW LEVEL SECURITY;

-- 12) Docente admin + listar salón
CREATE OR REPLACE FUNCTION public.sie_admin_listar_docentes(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS DISTINCT FROM 'Admin' THEN
    RETURN jsonb_build_object('error', 'No autorizado', 'teachers', '[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'error', null,
    'teachers', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', u.id_usuario,
        'username', u.username,
        'fullName', u.nombre_completo,
        'email', u.email,
        'active', u.activo,
        'classrooms', coalesce(u.grados_asignados->'classrooms', '[]'::jsonb),
        'lastAccess', u.ultimo_acceso,
        'createdAt', u.fecha_creacion
      ) ORDER BY u.nombre_completo)
      FROM public.usuarios u
      WHERE u.rol::text = 'Docente'
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_admin_crear_docente(
  p_token text,
  p_username text,
  p_password text,
  p_full_name text,
  p_email text,
  p_classrooms jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text; v_id int;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS DISTINCT FROM 'Admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autorizado');
  END IF;
  IF length(trim(coalesce(p_username, ''))) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuario inválido');
  END IF;
  IF length(trim(coalesce(p_password, ''))) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La contraseña debe tener al menos 6 caracteres');
  END IF;

  INSERT INTO public.usuarios (
    username, password_hash, nombre_completo, email, rol, grados_asignados, activo, cambio_password_obligatorio
  ) VALUES (
    trim(p_username),
    extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
    trim(p_full_name),
    trim(p_email),
    'Docente'::public.rol_usuario,
    jsonb_build_object('classrooms', coalesce(p_classrooms, '[]'::jsonb)),
    true,
    true
  ) RETURNING id_usuario INTO v_id;

  INSERT INTO public.auditoria_logs (
    tabla_afectada, accion, datos_anteriores, datos_nuevos, id_registro, id_usuario, fecha_hora, descripcion_accion
  ) VALUES (
    'usuarios', 'INSERT', NULL,
    jsonb_build_object('id_usuario', v_id, 'username', trim(p_username), 'rol', 'Docente', 'classrooms', coalesce(p_classrooms, '[]'::jsonb)),
    v_id, public.sie_sesion_usuario_id(), now(), 'Admin creó docente'
  );

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'error', null);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_admin_actualizar_docente(
  p_token text,
  p_id integer,
  p_full_name text,
  p_email text,
  p_classrooms jsonb,
  p_active boolean,
  p_password text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_rol text; v_old jsonb;
BEGIN
  SELECT rol INTO v_rol FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS DISTINCT FROM 'Admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autorizado');
  END IF;

  SELECT to_jsonb(u) INTO v_old FROM public.usuarios u WHERE u.id_usuario = p_id AND u.rol::text = 'Docente';

  UPDATE public.usuarios SET
    nombre_completo = trim(p_full_name),
    email = trim(p_email),
    grados_asignados = jsonb_build_object('classrooms', coalesce(p_classrooms, '[]'::jsonb)),
    activo = coalesce(p_active, activo),
    password_hash = CASE
      WHEN p_password IS NOT NULL AND length(trim(p_password)) >= 6
      THEN extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
      ELSE password_hash
    END
  WHERE id_usuario = p_id AND rol::text = 'Docente';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Docente no encontrado');
  END IF;

  INSERT INTO public.auditoria_logs (
    tabla_afectada, accion, datos_anteriores, datos_nuevos, id_registro, id_usuario, fecha_hora, descripcion_accion
  ) VALUES (
    'usuarios', 'UPDATE', v_old,
    jsonb_build_object(
      'id_usuario', p_id, 'nombre_completo', trim(p_full_name), 'email', trim(p_email),
      'classrooms', coalesce(p_classrooms, '[]'::jsonb), 'activo', coalesce(p_active, true),
      'password_reset', p_password IS NOT NULL AND length(trim(p_password)) >= 6
    ),
    p_id, public.sie_sesion_usuario_id(), now(), 'Admin actualizó docente'
  );

  RETURN jsonb_build_object('ok', true, 'error', null);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_docente_listar_estudiantes_salon(
  p_token text,
  p_level text,
  p_grade text,
  p_section text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_rol text;
  v_uid int;
  v_classrooms jsonb;
  v_allowed boolean := false;
  c jsonb;
  v_result jsonb;
BEGIN
  SELECT rol, id_usuario INTO v_rol, v_uid FROM public._sie_validar_token(p_token) LIMIT 1;
  IF v_rol IS NULL THEN
    RETURN jsonb_build_object('error', 'Sesión inválida o expirada', 'students', '[]'::jsonb);
  END IF;
  IF v_rol IS DISTINCT FROM 'Docente' THEN
    RETURN jsonb_build_object('error', 'No autorizado', 'students', '[]'::jsonb);
  END IF;

  SELECT u.grados_asignados::jsonb INTO v_classrooms FROM public.usuarios u WHERE u.id_usuario = v_uid;

  FOR c IN SELECT * FROM jsonb_array_elements(coalesce(v_classrooms->'classrooms', '[]'::jsonb))
  LOOP
    IF trim(p_level) = coalesce(c->>'level', '')
       AND trim(p_grade) = coalesce(c->>'grade', '')
       AND trim(p_section) = coalesce(c->>'section', '') THEN
      v_allowed := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('error', 'Salón no asignado a este docente', 'students', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(
    public._sie_student_json_completo(e, coalesce(n.nivel_actual, 0), coalesce(n.total_faltas_60_dias, 0))
    ORDER BY e.nombre_completo
  ), '[]'::jsonb)
  INTO v_result
  FROM public.estudiantes e
  LEFT JOIN public.v_estudiantes_nivel_actual n ON n.id_estudiante = e.id_estudiante
  WHERE e.activo = true
    AND e.nivel_educativo::text = trim(p_level)
    AND e.grado = trim(p_grade)
    AND e.seccion = trim(p_section);

  RETURN jsonb_build_object('students', v_result, 'error', null);
END;
$$;

-- 13) Anular incidencia
CREATE OR REPLACE FUNCTION public.anular_incidencia(
  p_id_incidencia integer,
  p_id_usuario integer,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
  v_uid integer;
BEGIN
  SELECT rol, id_usuario INTO v_rol, v_uid FROM public._sie_validar_token(public.sie_request_token()) LIMIT 1;
  IF v_rol IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sesión inválida o expirada');
  END IF;
  IF NOT public._sie_es_staff(v_rol) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autorizado');
  END IF;
  IF length(trim(coalesce(p_motivo, ''))) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El motivo debe tener al menos 20 caracteres');
  END IF;

  UPDATE public.incidencias
  SET estado = 'Anulada',
      motivo_anulacion = trim(p_motivo),
      id_usuario_anulacion = coalesce(p_id_usuario, v_uid),
      fecha_anulacion = now()
  WHERE id_incidencia = p_id_incidencia
    AND estado = 'Activa';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Incidencia no encontrada o no está Activa');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 14) RLS
ALTER TABLE public.app_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_llegada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_faltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas_padres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_reincidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_fotograficas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens_recuperacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.padres_estudiantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sie_usuarios_staff_all ON public.usuarios;
CREATE POLICY sie_usuarios_staff_all ON public.usuarios FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_usuarios_self_select ON public.usuarios;
CREATE POLICY sie_usuarios_self_select ON public.usuarios FOR SELECT TO anon, authenticated
  USING (id_usuario = public.sie_sesion_usuario_id() AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_estudiantes_staff_select ON public.estudiantes;
CREATE POLICY sie_estudiantes_staff_select ON public.estudiantes FOR SELECT TO anon, authenticated
  USING (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_estudiantes_staff_write ON public.estudiantes;
CREATE POLICY sie_estudiantes_staff_write ON public.estudiantes FOR INSERT TO anon, authenticated
  WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_estudiantes_staff_update ON public.estudiantes;
CREATE POLICY sie_estudiantes_staff_update ON public.estudiantes FOR UPDATE TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_estudiantes_padre_select ON public.estudiantes;
CREATE POLICY sie_estudiantes_padre_select ON public.estudiantes FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Padre' AND public.sie_padre_puede_ver_estudiante(id_estudiante));

DROP POLICY IF EXISTS sie_incidencias_staff_all ON public.incidencias;
CREATE POLICY sie_incidencias_staff_all ON public.incidencias FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_incidencias_padre_select ON public.incidencias;
CREATE POLICY sie_incidencias_padre_select ON public.incidencias FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Padre' AND public.sie_padre_puede_ver_estudiante(id_estudiante));

DROP POLICY IF EXISTS sie_incidencias_tutor_insert ON public.incidencias;
CREATE POLICY sie_incidencias_tutor_insert ON public.incidencias FOR INSERT TO anon, authenticated
  WITH CHECK (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_incidencias_tutor_select ON public.incidencias;
CREATE POLICY sie_incidencias_tutor_select ON public.incidencias FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_incidencias_docente_insert ON public.incidencias;
CREATE POLICY sie_incidencias_docente_insert ON public.incidencias FOR INSERT TO anon, authenticated
  WITH CHECK (public.sie_sesion_rol() = 'Docente' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_incidencias_docente_select ON public.incidencias;
CREATE POLICY sie_incidencias_docente_select ON public.incidencias FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Docente' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_llegada_staff_all ON public.registros_llegada;
CREATE POLICY sie_llegada_staff_all ON public.registros_llegada FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_llegada_tutor_insert ON public.registros_llegada;
CREATE POLICY sie_llegada_tutor_insert ON public.registros_llegada FOR INSERT TO anon, authenticated
  WITH CHECK (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_llegada_tutor_select ON public.registros_llegada;
CREATE POLICY sie_llegada_tutor_select ON public.registros_llegada FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_llegada_tutor_update ON public.registros_llegada;
CREATE POLICY sie_llegada_tutor_update ON public.registros_llegada FOR UPDATE TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion())
  WITH CHECK (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_llegada_padre_select ON public.registros_llegada;
CREATE POLICY sie_llegada_padre_select ON public.registros_llegada FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Padre' AND public.sie_padre_puede_ver_estudiante(id_estudiante));

DROP POLICY IF EXISTS sie_llegada_docente_insert ON public.registros_llegada;
CREATE POLICY sie_llegada_docente_insert ON public.registros_llegada
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.sie_sesion_rol() = 'Docente'
    AND public.sie_tiene_sesion()
    AND public._sie_docente_puede_ver_estudiante(id_estudiante)
  );

DROP POLICY IF EXISTS sie_llegada_docente_select ON public.registros_llegada;
CREATE POLICY sie_llegada_docente_select ON public.registros_llegada
  FOR SELECT TO anon, authenticated
  USING (
    public.sie_sesion_rol() = 'Docente'
    AND public.sie_tiene_sesion()
    AND public._sie_docente_puede_ver_estudiante(id_estudiante)
  );

DROP POLICY IF EXISTS sie_llegada_docente_update ON public.registros_llegada;
CREATE POLICY sie_llegada_docente_update ON public.registros_llegada
  FOR UPDATE TO anon, authenticated
  USING (
    public.sie_sesion_rol() = 'Docente'
    AND public.sie_tiene_sesion()
    AND public._sie_docente_puede_ver_estudiante(id_estudiante)
  )
  WITH CHECK (
    public.sie_sesion_rol() = 'Docente'
    AND public.sie_tiene_sesion()
    AND public._sie_docente_puede_ver_estudiante(id_estudiante)
  );

DROP POLICY IF EXISTS sie_faltas_select ON public.catalogo_faltas;
CREATE POLICY sie_faltas_select ON public.catalogo_faltas FOR SELECT TO anon, authenticated
  USING (public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_faltas_staff_write ON public.catalogo_faltas;
CREATE POLICY sie_faltas_staff_write ON public.catalogo_faltas FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_citas_staff_all ON public.citas_padres;
CREATE POLICY sie_citas_staff_all ON public.citas_padres FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_citas_tutor_rw ON public.citas_padres;
CREATE POLICY sie_citas_tutor_rw ON public.citas_padres FOR ALL TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion())
  WITH CHECK (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_citas_padre_select ON public.citas_padres;
CREATE POLICY sie_citas_padre_select ON public.citas_padres FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Padre' AND public.sie_padre_puede_ver_estudiante(id_estudiante));

DROP POLICY IF EXISTS sie_config_select ON public.configuracion_sistema;
CREATE POLICY sie_config_select ON public.configuracion_sistema FOR SELECT TO anon, authenticated
  USING (public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_config_staff_write ON public.configuracion_sistema;
CREATE POLICY sie_config_staff_write ON public.configuracion_sistema FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_reincidencia_select ON public.configuracion_reincidencia;
CREATE POLICY sie_reincidencia_select ON public.configuracion_reincidencia FOR SELECT TO anon, authenticated
  USING (public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_reincidencia_staff_write ON public.configuracion_reincidencia;
CREATE POLICY sie_reincidencia_staff_write ON public.configuracion_reincidencia FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_auditoria_staff_select ON public.auditoria_logs;
CREATE POLICY sie_auditoria_staff_select ON public.auditoria_logs FOR SELECT TO anon, authenticated
  USING (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_auditoria_system_insert ON public.auditoria_logs;
CREATE POLICY sie_auditoria_system_insert ON public.auditoria_logs
  FOR INSERT
  TO postgres, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS sie_comentarios_staff_all ON public.comentarios_incidencias;
CREATE POLICY sie_comentarios_staff_all ON public.comentarios_incidencias FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_comentarios_padre_select ON public.comentarios_incidencias;
CREATE POLICY sie_comentarios_padre_select ON public.comentarios_incidencias FOR SELECT TO anon, authenticated
  USING (
    public.sie_sesion_rol() = 'Padre'
    AND EXISTS (
      SELECT 1 FROM public.incidencias i
      WHERE i.id_incidencia = comentarios_incidencias.id_incidencia
        AND public.sie_padre_puede_ver_estudiante(i.id_estudiante)
    )
  );

DROP POLICY IF EXISTS sie_evidencias_staff_all ON public.evidencias_fotograficas;
CREATE POLICY sie_evidencias_staff_all ON public.evidencias_fotograficas FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_evidencias_docente_insert ON public.evidencias_fotograficas;
CREATE POLICY sie_evidencias_docente_insert ON public.evidencias_fotograficas FOR INSERT TO anon, authenticated
  WITH CHECK (public.sie_sesion_rol() = 'Docente' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_evidencias_padre_select ON public.evidencias_fotograficas;
CREATE POLICY sie_evidencias_padre_select ON public.evidencias_fotograficas FOR SELECT TO anon, authenticated
  USING (
    public.sie_sesion_rol() = 'Padre'
    AND EXISTS (
      SELECT 1 FROM public.incidencias i
      WHERE i.id_incidencia = evidencias_fotograficas.id_incidencia
        AND public.sie_padre_puede_ver_estudiante(i.id_estudiante)
    )
  );

DROP POLICY IF EXISTS sie_padres_est_staff_all ON public.padres_estudiantes;
CREATE POLICY sie_padres_est_staff_all ON public.padres_estudiantes FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_padres_est_padre_select ON public.padres_estudiantes;
CREATE POLICY sie_padres_est_padre_select ON public.padres_estudiantes FOR SELECT TO anon, authenticated
  USING (id_usuario = public.sie_sesion_usuario_id() AND public.sie_sesion_rol() = 'Padre');

-- 15) GRANTs
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.estudiantes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidencias TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_llegada TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_faltas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.citas_padres TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_sistema TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_reincidencia TO anon, authenticated;
GRANT SELECT ON public.auditoria_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios_incidencias TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidencias_fotograficas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.padres_estudiantes TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.v_dashboard_ejecutivo TO anon, authenticated;
GRANT SELECT ON public.v_estudiantes_nivel_actual TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.validar_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_iniciar_sesion(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_cerrar_sesion(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_renovar_sesion(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_buscar_estudiante_carnet(text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_buscar_estudiantes_nombre(text, text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_lista_estudiantes(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_estudiante_por_id(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_crear_estudiante(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_actualizar_estudiante(text, int, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_padre_mis_estudiantes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_solicitar_reset_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_cambiar_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_asistencia_por_dni(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asistencia_mes_por_estudiante(integer, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limites_llegada_publicos() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sie_hora_limite_por_nivel(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sie_fold_busqueda(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sie_estudiante_coincide_busqueda(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insertar_evidencia(integer, text, text, text, integer, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_admin_listar_docentes(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_admin_crear_docente(text, text, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_admin_actualizar_docente(text, integer, text, text, jsonb, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_docente_listar_estudiantes_salon(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anular_incidencia(integer, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_nivel_reincidencia(integer, timestamp with time zone) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.buscar_asistencia_por_dni(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.asistencia_mes_por_estudiante(integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_asistencia_por_dni(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asistencia_mes_por_estudiante(integer, integer, integer) TO anon, authenticated;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-perfil', 'fotos-perfil', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias', 'evidencias', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Usuarios autenticados pueden subir fotos de perfil" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir fotos de perfil"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "Fotos de perfil son públicas" ON storage.objects;
CREATE POLICY "Fotos de perfil son públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "Usuarios pueden actualizar fotos de perfil" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar fotos de perfil"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "Usuarios pueden eliminar fotos de perfil" ON storage.objects;
CREATE POLICY "Usuarios pueden eliminar fotos de perfil"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "Usuarios autenticados pueden subir evidencias" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir evidencias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "Evidencias son públicas" ON storage.objects;
CREATE POLICY "Evidencias son públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "Usuarios pueden actualizar evidencias" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar evidencias"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "Usuarios pueden eliminar evidencias" ON storage.objects;
CREATE POLICY "Usuarios pueden eliminar evidencias"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidencias');

-- También permitir anon en storage vía políticas para el cliente SIE (usa anon key + RPC)
DROP POLICY IF EXISTS "SIE anon puede subir fotos perfil" ON storage.objects;
CREATE POLICY "SIE anon puede subir fotos perfil"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "SIE anon puede subir evidencias" ON storage.objects;
CREATE POLICY "SIE anon puede subir evidencias"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "SIE anon puede actualizar fotos perfil" ON storage.objects;
CREATE POLICY "SIE anon puede actualizar fotos perfil"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "SIE anon puede actualizar evidencias" ON storage.objects;
CREATE POLICY "SIE anon puede actualizar evidencias"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "SIE anon puede eliminar fotos perfil" ON storage.objects;
CREATE POLICY "SIE anon puede eliminar fotos perfil"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "SIE anon puede eliminar evidencias" ON storage.objects;
CREATE POLICY "SIE anon puede eliminar evidencias"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'evidencias');

-- 16) Seed
INSERT INTO public.configuracion_sistema (clave, valor, descripcion) VALUES
  ('hora_limite_llegada', '08:00:00', 'Respaldo general de hora límite de llegada'),
  ('hora_limite_llegada_primaria', '08:00:00', 'Hora límite de llegada Primaria (America/Lima)'),
  ('hora_limite_llegada_secundaria', '08:00:00', 'Hora límite de llegada Secundaria (America/Lima)'),
  ('hora_limite_salida', '15:00:00', 'Hora límite de salida'),
  ('hora_cierre_colegio', '18:00:00', 'Hora de cierre / fuera de jornada'),
  ('categorias_faltas', '["Conducta","Uniforme","Académica","Puntualidad"]', 'Categorías de faltas (JSON)')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.configuracion_reincidencia (
  ventana_dias, puntos_falta_leve, puntos_falta_grave,
  umbral_nivel_1, umbral_nivel_2, umbral_nivel_3, umbral_nivel_4, umbral_nivel_5,
  activo, fecha_vigencia
) VALUES (
  60, 1, 2, 1, 3, 5, 8, 12, true, now()
);

-- Admin por defecto. Contraseña: Admin123!
-- Cambiar tras el primer acceso.
INSERT INTO public.usuarios (
  username, password_hash, nombre_completo, email, rol,
  activo, cambio_password_obligatorio
) VALUES (
  'admin',
  extensions.crypt('Admin123!', extensions.gen_salt('bf')),
  'Administrador Jean Piaget',
  'admin@jeanpiaget.edu.pe',
  'Admin'::public.rol_usuario,
  true,
  true
);

NOTIFY pgrst, 'reload schema';
