-- Jean Piaget: Falta automática + 3 tardanzas → Tardanza reiterada

BEGIN;

INSERT INTO public.catalogo_faltas (
  nombre_falta, categoria, es_grave, puntos_reincidencia, activo,
  orden_visualizacion, descripcion, recomendacion
)
SELECT
  'Falta',
  'Asistencia',
  false,
  2,
  true,
  1,
  'Ausencia: no se registró entrada del estudiante en el día.',
  'Justificar la inasistencia ante tutoría o dirección con el documento correspondiente. Coordinar con la familia el retorno y el plan de recuperación de clases.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalogo_faltas WHERE lower(nombre_falta) = 'falta'
);

UPDATE public.catalogo_faltas
SET
  categoria = 'Asistencia',
  activo = true,
  descripcion = COALESCE(NULLIF(trim(descripcion), ''), 'Tres o más tardanzas en el mismo mes.'),
  recomendacion = 'Ajustar horarios de salida de casa para llegar con anticipación. Conversar sobre la importancia de la puntualidad. Coordinar con tutoría si la reiteración continúa.'
WHERE lower(nombre_falta) = 'tardanza reiterada';

ALTER TABLE public.registros_llegada
  DROP CONSTRAINT IF EXISTS registros_llegada_estado_check;

ALTER TABLE public.registros_llegada
  ADD CONSTRAINT registros_llegada_estado_check
  CHECK (estado::text = ANY (ARRAY['A tiempo'::text, 'Tarde'::text, 'Falta'::text]));

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
  IF EXTRACT(DOW FROM p_fecha) IN (0, 6) OR p_fecha < v_inicio
     OR p_fecha > (timezone('America/Lima', now()))::date THEN
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
  'JP: marca Falta + incidencia si no hay llegada A tiempo/Tarde ese día.';

-- Tras registrar una tardanza: si hay >=3 «Tarde» en el mes, crear «Tardanza reiterada» (1/mes)
CREATE OR REPLACE FUNCTION public.sie_jp_check_tardanza_reiterada(
  p_id_estudiante integer,
  p_fecha date DEFAULT (timezone('America/Lima', now()))::date
)
RETURNS TABLE(creada boolean, id_incidencia integer, tardanzas_mes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_id_falta int;
  v_id_user int;
  v_id_inc int;
  v_mes_ini date;
  v_mes_fin date;
BEGIN
  v_mes_ini := date_trunc('month', p_fecha)::date;
  v_mes_fin := (date_trunc('month', p_fecha) + interval '1 month - 1 day')::date;

  SELECT count(*)::int INTO v_count
  FROM registros_llegada
  WHERE id_estudiante = p_id_estudiante
    AND fecha BETWEEN v_mes_ini AND v_mes_fin
    AND estado = 'Tarde';

  tardanzas_mes := v_count;
  creada := false;
  id_incidencia := NULL;

  IF v_count < 3 THEN
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id_falta INTO v_id_falta
  FROM catalogo_faltas
  WHERE lower(nombre_falta) = 'tardanza reiterada' AND COALESCE(activo, true)
  ORDER BY id_falta LIMIT 1;

  IF v_id_falta IS NULL THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- Ya existe una reiterada activa en el mes
  IF EXISTS (
    SELECT 1 FROM incidencias i
    WHERE i.id_estudiante = p_id_estudiante
      AND i.id_falta = v_id_falta
      AND i.estado IS DISTINCT FROM 'Anulada'
      AND (timezone('America/Lima', i.fecha_hora_registro))::date BETWEEN v_mes_ini AND v_mes_fin
  ) THEN
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id_usuario INTO v_id_user
  FROM usuarios WHERE rol IN ('Admin', 'Director')
  ORDER BY id_usuario LIMIT 1;
  IF v_id_user IS NULL THEN
    SELECT id_usuario INTO v_id_user FROM usuarios ORDER BY id_usuario LIMIT 1;
  END IF;

  INSERT INTO incidencias (id_estudiante, id_falta, id_usuario_registro, observaciones)
  VALUES (
    p_id_estudiante,
    v_id_falta,
    v_id_user,
    format('Generada automáticamente: %s tardanzas en el mes %s.', v_count, to_char(p_fecha, 'MM/YYYY'))
  )
  RETURNING incidencias.id_incidencia INTO v_id_inc;

  creada := true;
  id_incidencia := v_id_inc;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sie_jp_marcar_faltas_dia(date) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.sie_jp_check_tardanza_reiterada(integer, date) TO authenticated, anon, service_role;

COMMIT;
