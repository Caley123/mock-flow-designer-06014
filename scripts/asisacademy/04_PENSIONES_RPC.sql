-- =============================================================================
-- PENSIONES_JP.sql — Módulo pensiones (Jean Piaget)
-- Aplicar en SQL Editor del proyecto JP. Idempotente donde es posible.
--
-- Seguridad: NO hay Storage ni bytea para Excel/PDF.
-- Mora: marcar_pensiones_morosas() cuando hoy_lima > fecha_vencimiento y pagado=0.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columna cache en estudiantes
-- ---------------------------------------------------------------------------
ALTER TABLE public.estudiantes
  ADD COLUMN IF NOT EXISTS estado_pension text NOT NULL DEFAULT 'sin_dato';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'estudiantes_estado_pension_check'
  ) THEN
    ALTER TABLE public.estudiantes
      ADD CONSTRAINT estudiantes_estado_pension_check
      CHECK (estado_pension IN ('al_dia', 'pendiente', 'moroso', 'sin_dato'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Config singleton
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pensiones_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dia_vencimiento smallint NOT NULL DEFAULT 10 CHECK (dia_vencimiento BETWEEN 1 AND 28),
  monto_mensual numeric(12, 2) NULL,
  moneda text NOT NULL DEFAULT 'PEN',
  aviso_sonoro_activo boolean NOT NULL DEFAULT true,
  activo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by integer NULL REFERENCES public.usuarios(id_usuario)
);

INSERT INTO public.pensiones_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Tabla pensiones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pensiones (
  id bigserial PRIMARY KEY,
  id_estudiante integer NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  periodo text NOT NULL CHECK (periodo ~ '^\d{4}-\d{2}$'),
  fecha_vencimiento date NOT NULL,
  pagado smallint NOT NULL DEFAULT 0 CHECK (pagado IN (0, 1)),
  estado text NOT NULL CHECK (estado IN ('pagado', 'pendiente', 'moroso')),
  monto numeric(12, 2) NULL,
  fecha_pago date NULL,
  fuente text NOT NULL DEFAULT 'banco_excel'
    CHECK (fuente IN ('banco_excel', 'banco_pdf', 'manual')),
  notas text NULL,
  registrado_en timestamptz NOT NULL DEFAULT now(),
  registrado_por integer NULL REFERENCES public.usuarios(id_usuario),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_estudiante, periodo)
);

CREATE INDEX IF NOT EXISTS idx_pensiones_periodo_estado
  ON public.pensiones (periodo, estado);
CREATE INDEX IF NOT EXISTS idx_pensiones_periodo_pagado
  ON public.pensiones (periodo, pagado);
CREATE INDEX IF NOT EXISTS idx_pensiones_estudiante_periodo
  ON public.pensiones (id_estudiante, periodo);

-- ---------------------------------------------------------------------------
-- 4) Log de import (solo metadatos — NUNCA el archivo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pensiones_import_log (
  id bigserial PRIMARY KEY,
  periodo text NOT NULL,
  modo text NOT NULL CHECK (modo IN ('pagaron', 'no_pagaron')),
  nombre_archivo text NULL,
  filas_leidas integer NOT NULL DEFAULT 0,
  filas_ok integer NOT NULL DEFAULT 0,
  filas_sin_match integer NOT NULL DEFAULT 0,
  filas_ambiguas integer NOT NULL DEFAULT 0,
  fuente text NOT NULL DEFAULT 'banco_excel',
  importado_por integer NULL REFERENCES public.usuarios(id_usuario),
  importado_en timestamptz NOT NULL DEFAULT now(),
  detalle_json jsonb NULL
);

-- ---------------------------------------------------------------------------
-- 5) Grants + RLS
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pensiones TO anon, authenticated;
GRANT SELECT, UPDATE ON public.pensiones_config TO anon, authenticated;
GRANT SELECT, INSERT ON public.pensiones_import_log TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.pensiones_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.pensiones_import_log_id_seq TO anon, authenticated;

ALTER TABLE public.pensiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensiones_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensiones_import_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._sie_es_admin_o_director()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.sie_tiene_sesion()
    AND public.sie_sesion_rol() IN ('Admin', 'Director');
$$;

DROP POLICY IF EXISTS sie_pensiones_staff_select ON public.pensiones;
CREATE POLICY sie_pensiones_staff_select ON public.pensiones
  FOR SELECT TO anon, authenticated
  USING (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_pensiones_admin_write ON public.pensiones;
CREATE POLICY sie_pensiones_admin_write ON public.pensiones
  FOR ALL TO anon, authenticated
  USING (public._sie_es_admin_o_director())
  WITH CHECK (public._sie_es_admin_o_director());

DROP POLICY IF EXISTS sie_pensiones_padre_select ON public.pensiones;
CREATE POLICY sie_pensiones_padre_select ON public.pensiones
  FOR SELECT TO anon, authenticated
  USING (
    public.sie_sesion_rol() = 'Padre'
    AND public.sie_padre_puede_ver_estudiante(id_estudiante)
  );

DROP POLICY IF EXISTS sie_pensiones_config_staff_select ON public.pensiones_config;
CREATE POLICY sie_pensiones_config_staff_select ON public.pensiones_config
  FOR SELECT TO anon, authenticated
  USING (public.sie_es_staff_sesion() OR public.sie_sesion_rol() = 'Tutor');

DROP POLICY IF EXISTS sie_pensiones_config_admin_upd ON public.pensiones_config;
CREATE POLICY sie_pensiones_config_admin_upd ON public.pensiones_config
  FOR UPDATE TO anon, authenticated
  USING (public._sie_es_admin_o_director())
  WITH CHECK (public._sie_es_admin_o_director());

DROP POLICY IF EXISTS sie_pensiones_log_staff_select ON public.pensiones_import_log;
CREATE POLICY sie_pensiones_log_staff_select ON public.pensiones_import_log
  FOR SELECT TO anon, authenticated
  USING (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS sie_pensiones_log_admin_ins ON public.pensiones_import_log;
CREATE POLICY sie_pensiones_log_admin_ins ON public.pensiones_import_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (public._sie_es_admin_o_director());

-- ---------------------------------------------------------------------------
-- 6) Helpers periodo / mora / cache
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._sie_periodo_lima_actual()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(timezone('America/Lima', now()), 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION public._sie_hoy_lima()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (timezone('America/Lima', now()))::date;
$$;

CREATE OR REPLACE FUNCTION public._sie_fecha_vencimiento_periodo(p_periodo text, p_dia int)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_y int;
  v_m int;
  v_dia int;
BEGIN
  v_y := split_part(p_periodo, '-', 1)::int;
  v_m := split_part(p_periodo, '-', 2)::int;
  v_dia := GREATEST(1, LEAST(COALESCE(p_dia, 10), 28));
  RETURN make_date(v_y, v_m, v_dia);
END;
$$;

CREATE OR REPLACE FUNCTION public._sie_cache_estado_pension(p_estado text, p_pagado smallint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_estado IS NULL AND p_pagado IS NULL THEN 'sin_dato'
    WHEN coalesce(p_pagado, 0) = 1 OR p_estado = 'pagado' THEN 'al_dia'
    WHEN p_estado = 'pendiente' THEN 'pendiente'
    WHEN p_estado = 'moroso' OR coalesce(p_pagado, 0) = 0 THEN 'moroso'
    ELSE 'sin_dato'
  END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_pensiones_morosas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_hoy date := public._sie_hoy_lima();
BEGIN
  -- Día siguiente al vencimiento: hoy > fecha_vencimiento y pagado=0 → moroso
  UPDATE public.pensiones
  SET estado = 'moroso',
      actualizado_en = now()
  WHERE pagado = 0
    AND estado = 'pendiente'
    AND fecha_vencimiento < v_hoy;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.pensiones_refresh_estado_estudiante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id int;
  v_periodo text := public._sie_periodo_lima_actual();
  v_row public.pensiones%ROWTYPE;
BEGIN
  v_id := COALESCE(NEW.id_estudiante, OLD.id_estudiante);

  SELECT * INTO v_row
  FROM public.pensiones
  WHERE id_estudiante = v_id AND periodo = v_periodo
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.estudiantes
    SET estado_pension = CASE
      WHEN v_row.pagado = 1 OR v_row.estado = 'pagado' THEN 'al_dia'
      WHEN v_row.estado = 'pendiente' THEN 'pendiente'
      ELSE 'moroso'
    END
    WHERE id_estudiante = v_id;
  ELSE
    UPDATE public.estudiantes
    SET estado_pension = 'sin_dato'
    WHERE id_estudiante = v_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_pensiones_refresh_estado ON public.pensiones;
CREATE TRIGGER trg_pensiones_refresh_estado
  AFTER INSERT OR UPDATE OR DELETE ON public.pensiones
  FOR EACH ROW
  EXECUTE FUNCTION public.pensiones_refresh_estado_estudiante();

-- ---------------------------------------------------------------------------
-- 7) Extender JSON estudiante con estadoPension
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._sie_student_json_basico(e public.estudiantes)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'id', e.id_estudiante,
    'fullName', e.nombre_completo,
    'grade', e.grado,
    'section', e.seccion,
    'level', e.nivel_educativo,
    'barcode', e.codigo_barras,
    'profilePhoto', e.foto_perfil,
    'active', e.activo,
    'reincidenceLevel', 0,
    'faultsLast60Days', 0,
    'estadoPension', coalesce(e.estado_pension, 'sin_dato')
  );
$$;

CREATE OR REPLACE FUNCTION public._sie_student_json_tutor(e public.estudiantes)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public._sie_student_json_basico(e) || jsonb_build_object(
    'contactPhone', e.telefono_contacto,
    'emergencyPhone', e.telefono_emergencia,
    'estadoPension', coalesce(e.estado_pension, 'sin_dato')
  );
$$;

CREATE OR REPLACE FUNCTION public._sie_student_json_completo(
  e public.estudiantes,
  p_nivel int DEFAULT 0,
  p_faltas bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public._sie_student_json_basico(e) || jsonb_build_object(
    'reincidenceLevel', coalesce(p_nivel, 0),
    'faultsLast60Days', coalesce(p_faltas, 0)::int,
    'contactPhone', e.telefono_contacto,
    'contactEmail', e.email_contacto,
    'responsibleName', e.nombre_responsable,
    'responsibleRelationship', e.parentesco_responsable,
    'emergencyPhone', e.telefono_emergencia,
    'estadoPension', coalesce(e.estado_pension, 'sin_dato')
  );
$$;

-- ---------------------------------------------------------------------------
-- 8) RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sie_pensiones_get_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.pensiones_config%ROWTYPE;
BEGIN
  IF NOT public.sie_tiene_sesion() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin sesión');
  END IF;

  SELECT * INTO v_cfg FROM public.pensiones_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.pensiones_config (id) VALUES (1)
    RETURNING * INTO v_cfg;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'config', jsonb_build_object(
      'diaVencimiento', v_cfg.dia_vencimiento,
      'montoMensual', v_cfg.monto_mensual,
      'moneda', v_cfg.moneda,
      'avisoSonoroActivo', v_cfg.aviso_sonoro_activo,
      'activo', v_cfg.activo
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_pensiones_set_config(
  p_dia_vencimiento int DEFAULT NULL,
  p_monto_mensual numeric DEFAULT NULL,
  p_aviso_sonoro_activo boolean DEFAULT NULL,
  p_activo boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.pensiones_config%ROWTYPE;
BEGIN
  IF NOT public._sie_es_admin_o_director() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo Admin o Director');
  END IF;

  UPDATE public.pensiones_config
  SET
    dia_vencimiento = COALESCE(p_dia_vencimiento, dia_vencimiento),
    monto_mensual = CASE
      WHEN p_monto_mensual IS NULL AND p_dia_vencimiento IS NULL
           AND p_aviso_sonoro_activo IS NULL AND p_activo IS NULL
        THEN monto_mensual
      WHEN p_monto_mensual IS NOT NULL THEN p_monto_mensual
      ELSE monto_mensual
    END,
    aviso_sonoro_activo = COALESCE(p_aviso_sonoro_activo, aviso_sonoro_activo),
    activo = COALESCE(p_activo, activo),
    updated_at = now(),
    updated_by = public.sie_sesion_usuario_id()
  WHERE id = 1
  RETURNING * INTO v_cfg;

  -- Permitir limpiar monto con -1 sentinel desde cliente (opcional)
  IF p_monto_mensual IS NOT NULL AND p_monto_mensual < 0 THEN
    UPDATE public.pensiones_config
    SET monto_mensual = NULL, updated_at = now()
    WHERE id = 1
    RETURNING * INTO v_cfg;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'config', jsonb_build_object(
      'diaVencimiento', v_cfg.dia_vencimiento,
      'montoMensual', v_cfg.monto_mensual,
      'moneda', v_cfg.moneda,
      'avisoSonoroActivo', v_cfg.aviso_sonoro_activo,
      'activo', v_cfg.activo
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_pensiones_marcar_morosas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n int;
BEGIN
  IF NOT public.sie_tiene_sesion() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin sesión');
  END IF;
  IF NOT (public.sie_es_staff_sesion() OR public._sie_es_admin_o_director()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso');
  END IF;

  v_n := public.marcar_pensiones_morosas();
  RETURN jsonb_build_object('ok', true, 'actualizados', v_n);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_pensiones_upsert_lote(
  p_periodo text,
  p_modo text,
  p_filas jsonb,
  p_nombre_archivo text DEFAULT NULL,
  p_filas_sin_match int DEFAULT 0,
  p_filas_ambiguas int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.pensiones_config%ROWTYPE;
  v_venc date;
  v_hoy date := public._sie_hoy_lima();
  v_fila jsonb;
  v_id int;
  v_estado text;
  v_pagado smallint;
  v_monto numeric;
  v_fecha_pago date;
  v_ok int := 0;
  v_leidas int := 0;
  v_log_id bigint;
  v_user int;
BEGIN
  IF NOT public._sie_es_admin_o_director() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo Admin o Director');
  END IF;

  IF p_periodo IS NULL OR p_periodo !~ '^\d{4}-\d{2}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Periodo inválido (YYYY-MM)');
  END IF;

  IF p_modo NOT IN ('pagaron', 'no_pagaron') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Modo inválido');
  END IF;

  IF p_filas IS NULL OR jsonb_typeof(p_filas) <> 'array' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Filas inválidas');
  END IF;

  SELECT * INTO v_cfg FROM public.pensiones_config WHERE id = 1;
  v_venc := public._sie_fecha_vencimiento_periodo(p_periodo, v_cfg.dia_vencimiento);
  v_user := public.sie_sesion_usuario_id();

  FOR v_fila IN SELECT * FROM jsonb_array_elements(p_filas)
  LOOP
    v_leidas := v_leidas + 1;
    v_id := NULLIF(v_fila->>'id_estudiante', '')::int;
    IF v_id IS NULL THEN
      CONTINUE;
    END IF;

    IF p_modo = 'pagaron' THEN
      v_pagado := 1;
      v_estado := 'pagado';
    ELSE
      v_pagado := 0;
      IF v_hoy > v_venc THEN
        v_estado := 'moroso';
      ELSE
        v_estado := 'pendiente';
      END IF;
    END IF;

    -- Override explícito si el cliente manda estado/pagado
    IF v_fila ? 'pagado' AND (v_fila->>'pagado') IS NOT NULL THEN
      v_pagado := GREATEST(0, LEAST(1, (v_fila->>'pagado')::int));
    END IF;
    IF v_fila ? 'estado' AND NULLIF(v_fila->>'estado', '') IS NOT NULL THEN
      v_estado := v_fila->>'estado';
    END IF;

    v_monto := NULLIF(v_fila->>'monto', '')::numeric;
    IF v_monto IS NULL THEN
      v_monto := v_cfg.monto_mensual;
    END IF;
    v_fecha_pago := NULLIF(v_fila->>'fecha_pago', '')::date;

    INSERT INTO public.pensiones (
      id_estudiante, periodo, fecha_vencimiento, pagado, estado,
      monto, fecha_pago, fuente, registrado_por, actualizado_en
    ) VALUES (
      v_id, p_periodo, v_venc, v_pagado, v_estado,
      v_monto, v_fecha_pago, 'banco_excel', v_user, now()
    )
    ON CONFLICT (id_estudiante, periodo) DO UPDATE SET
      fecha_vencimiento = EXCLUDED.fecha_vencimiento,
      pagado = EXCLUDED.pagado,
      estado = EXCLUDED.estado,
      monto = COALESCE(EXCLUDED.monto, public.pensiones.monto),
      fecha_pago = COALESCE(EXCLUDED.fecha_pago, public.pensiones.fecha_pago),
      fuente = EXCLUDED.fuente,
      actualizado_en = now();

    v_ok := v_ok + 1;
  END LOOP;

  PERFORM public.marcar_pensiones_morosas();

  INSERT INTO public.pensiones_import_log (
    periodo, modo, nombre_archivo, filas_leidas, filas_ok,
    filas_sin_match, filas_ambiguas, fuente, importado_por
  ) VALUES (
    p_periodo, p_modo, p_nombre_archivo, v_leidas, v_ok,
    coalesce(p_filas_sin_match, 0), coalesce(p_filas_ambiguas, 0),
    'banco_excel', v_user
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'ok', true,
    'importId', v_log_id,
    'filasOk', v_ok,
    'filasLeidas', v_leidas
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_pensiones_listar(p_periodo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.sie_tiene_sesion() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin sesión');
  END IF;
  IF NOT public.sie_es_staff_sesion() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso');
  END IF;

  PERFORM public.marcar_pensiones_morosas();

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'idEstudiante', p.id_estudiante,
      'periodo', p.periodo,
      'fechaVencimiento', p.fecha_vencimiento,
      'pagado', p.pagado,
      'estado', p.estado,
      'monto', p.monto,
      'fechaPago', p.fecha_pago,
      'fuente', p.fuente,
      'notas', p.notas,
      'registradoEn', p.registrado_en,
      'nombreEstudiante', e.nombre_completo,
      'grado', e.grado,
      'seccion', e.seccion,
      'barcode', e.codigo_barras,
      'contactPhone', e.telefono_contacto,
      'emergencyPhone', e.telefono_emergencia
    )
    ORDER BY e.nombre_completo
  ), '[]'::jsonb)
  INTO v_rows
  FROM public.pensiones p
  JOIN public.estudiantes e ON e.id_estudiante = p.id_estudiante
  WHERE p.periodo = p_periodo;

  RETURN jsonb_build_object('ok', true, 'rows', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_pensiones_historial_anio(
  p_id_estudiante int,
  p_anio int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
  v_rows jsonb;
BEGIN
  IF NOT public.sie_tiene_sesion() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin sesión');
  END IF;

  v_rol := public.sie_sesion_rol();
  IF v_rol = 'Padre' THEN
    IF NOT public.sie_padre_puede_ver_estudiante(p_id_estudiante) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso');
    END IF;
  ELSIF NOT public.sie_es_staff_sesion() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso');
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'idEstudiante', p.id_estudiante,
      'periodo', p.periodo,
      'fechaVencimiento', p.fecha_vencimiento,
      'pagado', p.pagado,
      'estado', p.estado,
      'monto', p.monto,
      'fechaPago', p.fecha_pago,
      'fuente', p.fuente,
      'notas', p.notas,
      'registradoEn', p.registrado_en
    )
    ORDER BY p.periodo
  ), '[]'::jsonb)
  INTO v_rows
  FROM public.pensiones p
  WHERE p.id_estudiante = p_id_estudiante
    AND p.periodo LIKE p_anio::text || '-%';

  RETURN jsonb_build_object('ok', true, 'rows', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_pensiones_actualizar_manual(
  p_id bigint,
  p_pagado smallint DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_monto numeric DEFAULT NULL,
  p_notas text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.pensiones%ROWTYPE;
BEGIN
  IF NOT public._sie_es_admin_o_director() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo Admin o Director');
  END IF;

  UPDATE public.pensiones
  SET
    pagado = COALESCE(p_pagado, pagado),
    estado = COALESCE(NULLIF(p_estado, ''), estado),
    monto = COALESCE(p_monto, monto),
    notas = COALESCE(p_notas, notas),
    fuente = 'manual',
    fecha_pago = CASE
      WHEN COALESCE(p_pagado, pagado) = 1 THEN coalesce(fecha_pago, public._sie_hoy_lima())
      ELSE fecha_pago
    END,
    actualizado_en = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Registro no encontrado');
  END IF;

  -- Consistencia pagado/estado
  IF v_row.pagado = 1 THEN
    UPDATE public.pensiones SET estado = 'pagado', actualizado_en = now() WHERE id = p_id
    RETURNING * INTO v_row;
  ELSIF v_row.pagado = 0 AND v_row.fecha_vencimiento < public._sie_hoy_lima() THEN
    UPDATE public.pensiones SET estado = 'moroso', actualizado_en = now() WHERE id = p_id
    RETURNING * INTO v_row;
  ELSIF v_row.pagado = 0 THEN
    UPDATE public.pensiones SET estado = 'pendiente', actualizado_en = now() WHERE id = p_id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'row', jsonb_build_object(
      'id', v_row.id,
      'idEstudiante', v_row.id_estudiante,
      'periodo', v_row.periodo,
      'pagado', v_row.pagado,
      'estado', v_row.estado,
      'monto', v_row.monto
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sie_pensiones_import_logs(p_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.sie_es_staff_sesion() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso');
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      id,
      periodo,
      modo,
      nombre_archivo AS "nombreArchivo",
      filas_leidas AS "filasLeidas",
      filas_ok AS "filasOk",
      filas_sin_match AS "filasSinMatch",
      filas_ambiguas AS "filasAmbiguas",
      importado_en AS "importadoEn"
    FROM public.pensiones_import_log
    ORDER BY importado_en DESC
    LIMIT GREATEST(1, LEAST(coalesce(p_limit, 20), 100))
  ) t;

  RETURN jsonb_build_object('ok', true, 'rows', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_pensiones_morosas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_get_config() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_set_config(int, numeric, boolean, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_marcar_morosas() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_upsert_lote(text, text, jsonb, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_listar(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_historial_anio(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_actualizar_manual(bigint, smallint, text, numeric, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sie_pensiones_import_logs(int) TO anon, authenticated;

-- Verificación rápida
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'estudiantes' AND column_name = 'estado_pension';
SELECT * FROM public.pensiones_config;

NOTIFY pgrst, 'reload schema';

