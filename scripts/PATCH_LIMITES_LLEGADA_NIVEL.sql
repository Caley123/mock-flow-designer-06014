-- Límites de llegada por nivel (Primaria / Secundaria).
-- IMPORTANTE: funciones SECURITY DEFINER para que el trigger del tutor
-- pueda leer estudiantes + configuracion_sistema (RLS bloquea al rol Tutor).
-- Sin esto, el nivel queda NULL y se aplica 08:00 aunque secundaria sea 10:40.
-- Ejecutar en Supabase → SQL Editor.

CREATE OR REPLACE FUNCTION public._sie_config_hora(p_clave text, p_default text DEFAULT '08:00')
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
  v_match text[];
BEGIN
  SELECT valor::text INTO v_raw
  FROM public.configuracion_sistema
  WHERE clave = p_clave
  LIMIT 1;

  IF v_raw IS NULL THEN
    BEGIN
      SELECT valor::text INTO v_raw
      FROM public.configuracion
      WHERE clave = p_clave
      LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
      v_raw := NULL;
    END;
  END IF;

  v_raw := trim(coalesce(v_raw, p_default));
  v_match := regexp_match(v_raw, '^(\d{1,2}):(\d{2})');
  IF v_match IS NULL THEN
    v_match := regexp_match(v_raw, 'T(\d{1,2}):(\d{2})');
  END IF;
  IF v_match IS NULL THEN
    RETURN left(p_default, 5);
  END IF;
  RETURN lpad(v_match[1], 2, '0') || ':' || v_match[2];
END;
$$;

CREATE OR REPLACE FUNCTION public._sie_hora_limite_por_nivel(p_nivel text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Primaria/Secundaria NO usan hora_limite_llegada (general).
  SELECT CASE
    WHEN lower(coalesce(p_nivel, '')) LIKE '%prim%'
      THEN public._sie_config_hora('hora_limite_llegada_primaria', '08:00')
    WHEN lower(coalesce(p_nivel, '')) LIKE '%sec%'
      THEN public._sie_config_hora('hora_limite_llegada_secundaria', '08:00')
    ELSE public._sie_config_hora(
      'hora_limite_llegada_secundaria',
      public._sie_config_hora('hora_limite_llegada_primaria', '08:00')
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public._sie_normalizar_hora(p_hora text)
RETURNS time
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_match text[];
BEGIN
  v_match := regexp_match(trim(coalesce(p_hora, '')), '(\d{1,2}):(\d{2})');
  IF v_match IS NULL THEN
    RETURN time '00:00';
  END IF;
  RETURN (lpad(v_match[1], 2, '0') || ':' || v_match[2] || ':00')::time;
END;
$$;

CREATE OR REPLACE FUNCTION public._sie_estado_llegada(p_hora text, p_nivel text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public._sie_normalizar_hora(p_hora)
      <= public._sie_normalizar_hora(public._sie_hora_limite_por_nivel(p_nivel))
      THEN 'A tiempo'
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
    'general', public._sie_config_hora(
      'hora_limite_llegada_secundaria',
      public._sie_config_hora('hora_limite_llegada_primaria', '08:00')
    ),
    'primaria', public._sie_config_hora('hora_limite_llegada_primaria', '08:00'),
    'secundaria', public._sie_config_hora('hora_limite_llegada_secundaria', '08:00')
  );
$$;

-- Portal padres / WhatsApp: estado guardado en BD (no recalcula).
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
  FROM estudiantes
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
    'status', estado
  )
  INTO v_arrival_today
  FROM registros_llegada
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
        'status', estado
      )
      ORDER BY fecha DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent
  FROM (
    SELECT id_registro, id_estudiante, fecha, hora_llegada, estado
    FROM registros_llegada
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
    'recentArrivals', v_recent
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
BEGIN
  IF p_student_id IS NULL OR p_year IS NULL OR p_month IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF p_month < 1 OR p_month > 12 THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id_registro,
          'studentId', id_estudiante,
          'date', fecha,
          'arrivalTime', left(hora_llegada::text, 5),
          'status', estado
        )
        ORDER BY fecha ASC
      )
      FROM registros_llegada
      WHERE id_estudiante = p_student_id
        AND fecha >= make_date(p_year, p_month, 1)
        AND fecha < (make_date(p_year, p_month, 1) + interval '1 month')::date
    ),
    '[]'::jsonb
  );
END;
$$;

-- Trigger: lee nivel del estudiante aunque el tutor no tenga SELECT en estudiantes.
CREATE OR REPLACE FUNCTION public.trg_fn_estado_llegada_por_nivel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel text;
BEGIN
  SELECT e.nivel_educativo::text INTO v_nivel
  FROM public.estudiantes e
  WHERE e.id_estudiante = NEW.id_estudiante;

  NEW.estado := public._sie_estado_llegada(NEW.hora_llegada::text, v_nivel);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estado_llegada_por_nivel ON public.registros_llegada;
CREATE TRIGGER trg_estado_llegada_por_nivel
BEFORE INSERT OR UPDATE OF hora_llegada, id_estudiante, estado
ON public.registros_llegada
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_estado_llegada_por_nivel();

-- Corrige registros recientes mal marcados (p. ej. 09:41 con límite sec 10:40 → A tiempo).
UPDATE public.registros_llegada r
SET estado = public._sie_estado_llegada(
  r.hora_llegada::text,
  e.nivel_educativo::text
)
FROM public.estudiantes e
WHERE e.id_estudiante = r.id_estudiante
  AND r.fecha >= (timezone('America/Lima', now()))::date - 7
  AND r.estado IS DISTINCT FROM public._sie_estado_llegada(
    r.hora_llegada::text,
    e.nivel_educativo::text
  );

GRANT EXECUTE ON FUNCTION public._sie_config_hora(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sie_hora_limite_por_nivel(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sie_estado_llegada(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sie_normalizar_hora(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limites_llegada_publicos() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_asistencia_por_dni(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asistencia_mes_por_estudiante(integer, integer, integer) TO anon, authenticated;
