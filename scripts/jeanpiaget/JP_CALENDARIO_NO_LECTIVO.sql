-- Jean Piaget: calendario no lectivo (feriados + días sin clases del colegio)
-- Evita marcar Falta automática en esas fechas.

BEGIN;

CREATE TABLE IF NOT EXISTS public.calendario_no_lectivo (
  id serial PRIMARY KEY,
  fecha date NOT NULL,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('nacional', 'colegio')),
  activo boolean NOT NULL DEFAULT true,
  origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('seed', 'manual')),
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendario_no_lectivo_fecha_key UNIQUE (fecha)
);

CREATE INDEX IF NOT EXISTS idx_calendario_no_lectivo_activo_fecha
  ON public.calendario_no_lectivo (fecha)
  WHERE activo;

COMMENT ON TABLE public.calendario_no_lectivo IS
  'Días sin clases: feriados nacionales y días definidos por el colegio. El cierre de faltas no marca Falta en estas fechas.';

INSERT INTO public.calendario_no_lectivo (fecha, nombre, tipo, activo, origen)
VALUES
  ('2026-01-01', 'Año Nuevo', 'nacional', true, 'seed'),
  ('2026-04-02', 'Jueves Santo', 'nacional', true, 'seed'),
  ('2026-04-03', 'Viernes Santo', 'nacional', true, 'seed'),
  ('2026-05-01', 'Día del Trabajo', 'nacional', true, 'seed'),
  ('2026-06-07', 'Batalla de Arica y Día de la Bandera', 'nacional', true, 'seed'),
  ('2026-06-29', 'San Pedro y San Pablo', 'nacional', true, 'seed'),
  ('2026-07-23', 'Día de la Fuerza Aérea del Perú', 'nacional', true, 'seed'),
  ('2026-07-28', 'Fiestas Patrias', 'nacional', true, 'seed'),
  ('2026-07-29', 'Fiestas Patrias', 'nacional', true, 'seed'),
  ('2026-08-06', 'Batalla de Junín', 'nacional', true, 'seed'),
  ('2026-08-30', 'Santa Rosa de Lima', 'nacional', true, 'seed'),
  ('2026-10-08', 'Combate de Angamos', 'nacional', true, 'seed'),
  ('2026-11-01', 'Día de Todos los Santos', 'nacional', true, 'seed'),
  ('2026-12-08', 'Inmaculada Concepción', 'nacional', true, 'seed'),
  ('2026-12-09', 'Batalla de Ayacucho', 'nacional', true, 'seed'),
  ('2026-12-25', 'Navidad', 'nacional', true, 'seed')
ON CONFLICT (fecha) DO NOTHING;

ALTER TABLE public.calendario_no_lectivo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sie_calendario_no_lectivo_select ON public.calendario_no_lectivo;
CREATE POLICY sie_calendario_no_lectivo_select
  ON public.calendario_no_lectivo
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS sie_calendario_no_lectivo_write ON public.calendario_no_lectivo;
CREATE POLICY sie_calendario_no_lectivo_write
  ON public.calendario_no_lectivo
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendario_no_lectivo TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.calendario_no_lectivo_id_seq TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sie_jp_marcar_faltas_dia(
  p_fecha date DEFAULT (timezone('America/Lima', now()))::date
)
RETURNS TABLE(estudiantes_marcados integer, incidencias_creadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_falta int;
  v_id_user int;
  v_inicio date := DATE '2026-09-08';
  v_marcados int := 0;
  v_inc int := 0;
  r record;
BEGIN
  IF EXTRACT(DOW FROM p_fecha) IN (0, 6)
     OR p_fecha < v_inicio
     OR p_fecha > (timezone('America/Lima', now()))::date
     OR EXISTS (
       SELECT 1
       FROM calendario_no_lectivo c
       WHERE c.fecha = p_fecha AND c.activo IS TRUE
     )
  THEN
    estudiantes_marcados := 0;
    incidencias_creadas := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id_falta INTO v_id_falta
  FROM catalogo_faltas
  WHERE lower(nombre_falta) = 'falta' AND COALESCE(activo, true)
  ORDER BY id_falta LIMIT 1;

  IF v_id_falta IS NULL THEN
    RAISE EXCEPTION 'No existe catalogo_faltas «Falta» activa';
  END IF;

  SELECT id_usuario INTO v_id_user
  FROM usuarios
  WHERE rol IN ('Admin', 'Director')
  ORDER BY id_usuario LIMIT 1;

  IF v_id_user IS NULL THEN
    SELECT id_usuario INTO v_id_user FROM usuarios ORDER BY id_usuario LIMIT 1;
  END IF;

  FOR r IN
    SELECT e.id_estudiante
    FROM estudiantes e
    WHERE COALESCE(e.activo, true) IS TRUE
      AND NOT EXISTS (
        SELECT 1 FROM registros_llegada rl
        WHERE rl.id_estudiante = e.id_estudiante
          AND rl.fecha = p_fecha
          AND rl.estado IN ('A tiempo', 'Tarde')
      )
  LOOP
    INSERT INTO registros_llegada (
      id_estudiante, fecha, hora_llegada, estado, registrado_por, fecha_creacion
    ) VALUES (
      r.id_estudiante, p_fecha, TIME '00:00:00', 'Falta', v_id_user, now()
    )
    ON CONFLICT (id_estudiante, fecha) DO UPDATE
      SET estado = 'Falta'
      WHERE registros_llegada.estado NOT IN ('A tiempo', 'Tarde');

    IF EXISTS (
      SELECT 1 FROM registros_llegada
      WHERE id_estudiante = r.id_estudiante AND fecha = p_fecha AND estado = 'Falta'
    ) THEN
      v_marcados := v_marcados + 1;

      IF NOT EXISTS (
        SELECT 1 FROM incidencias i
        WHERE i.id_estudiante = r.id_estudiante
          AND i.id_falta = v_id_falta
          AND i.estado IS DISTINCT FROM 'Anulada'
          AND (timezone('America/Lima', i.fecha_hora_registro))::date = p_fecha
      ) THEN
        INSERT INTO incidencias (
          id_estudiante, id_falta, id_usuario_registro, observaciones
        ) VALUES (
          r.id_estudiante,
          v_id_falta,
          v_id_user,
          'Generada automáticamente: sin registro de entrada al cierre de jornada.'
        );
        v_inc := v_inc + 1;
      END IF;
    END IF;
  END LOOP;

  estudiantes_marcados := v_marcados;
  incidencias_creadas := v_inc;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.sie_jp_marcar_faltas_dia(date) IS
  'JP: marca Falta + incidencia si no hay llegada; omite fines de semana y calendario_no_lectivo activo.';

COMMIT;
