-- =============================================================================
-- Asis Academy — 02 tablas talleres / pensiones / outbox
-- Ejecutar DESPUES de 01_SIE_CORE_RPC.sql
-- Preferible: en su lugar corrér scripts/TALLERES_JP.sql + scripts/PENSIONES_JP.sql
--             + scripts/TALLERES_LLEGADAS_JP.sql si existen en el repo.
-- Este archivo es el mínimo para que el seed (03) no falle.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.estudiantes') IS NULL THEN
    RAISE EXCEPTION
      'Falta public.estudiantes. Ejecuta PRIMERO 01_SIE_CORE_RPC.sql (completo, sin errores) y luego este 02.';
  END IF;
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION
      'Falta public.usuarios. Ejecuta PRIMERO 01_SIE_CORE_RPC.sql y luego este 02.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.talleres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text NULL,
  dia_semana smallint[] NULL,
  hora_inicio time NULL,
  hora_fin time NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.taller_inscritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id uuid NOT NULL REFERENCES public.talleres(id) ON DELETE CASCADE,
  id_estudiante integer NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  UNIQUE (taller_id, id_estudiante)
);

CREATE TABLE IF NOT EXISTS public.taller_asistencias (
  id_registro bigserial PRIMARY KEY,
  taller_id uuid NOT NULL REFERENCES public.talleres(id) ON DELETE CASCADE,
  id_estudiante integer NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_llegada text NULL,
  hora_salida text NULL,
  estado text NULL CHECK (estado IS NULL OR estado IN ('A tiempo', 'Tarde')),
  tipo_salida text NULL CHECK (tipo_salida IS NULL OR tipo_salida IN ('Normal', 'Autorizada', 'Sin registro')),
  registrado_por integer NULL REFERENCES public.usuarios(id_usuario),
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taller_id, id_estudiante, fecha)
);

CREATE TABLE IF NOT EXISTS public.taller_llegadas (
  id_registro bigserial PRIMARY KEY,
  id_estudiante integer NOT NULL REFERENCES public.estudiantes(id_estudiante),
  fecha date NOT NULL,
  hora_llegada text NOT NULL,
  registrado_por integer REFERENCES public.usuarios(id_usuario),
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  hora_salida text
);

ALTER TABLE public.incidencias
  ADD COLUMN IF NOT EXISTS taller_id uuid NULL REFERENCES public.talleres(id) ON DELETE SET NULL;

ALTER TABLE public.catalogo_faltas
  ADD COLUMN IF NOT EXISTS recomendacion TEXT NULL;

ALTER TABLE public.estudiantes
  ADD COLUMN IF NOT EXISTS estado_pension text NOT NULL DEFAULT 'sin_dato';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estudiantes_estado_pension_check'
  ) THEN
    ALTER TABLE public.estudiantes
      ADD CONSTRAINT estudiantes_estado_pension_check
      CHECK (estado_pension IN ('al_dia', 'pendiente', 'moroso', 'sin_dato'));
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS public.asis_outbox (
  id bigserial PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'salida', 'incidencia', 'aviso')),
  id_estudiante integer NOT NULL,
  id_registro integer NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  procesado boolean NOT NULL DEFAULT false,
  intentos integer NOT NULL DEFAULT 0,
  ultimo_error text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  procesado_en timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.talleres TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taller_inscritos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taller_asistencias TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taller_llegadas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pensiones TO anon, authenticated;
GRANT SELECT, UPDATE ON public.pensiones_config TO anon, authenticated;
GRANT SELECT, INSERT ON public.pensiones_import_log TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.asis_outbox TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER TABLE public.talleres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taller_inscritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taller_asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taller_llegadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensiones_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensiones_import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asis_outbox ENABLE ROW LEVEL SECURITY;

-- Políticas demo: staff + tutor (login SIE)
DROP POLICY IF EXISTS aa_talleres_all ON public.talleres;
CREATE POLICY aa_talleres_all ON public.talleres FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()))
  WITH CHECK (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()));

DROP POLICY IF EXISTS aa_taller_inscritos_all ON public.taller_inscritos;
CREATE POLICY aa_taller_inscritos_all ON public.taller_inscritos FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()))
  WITH CHECK (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()));

DROP POLICY IF EXISTS aa_taller_asist_all ON public.taller_asistencias;
CREATE POLICY aa_taller_asist_all ON public.taller_asistencias FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()))
  WITH CHECK (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()));

DROP POLICY IF EXISTS aa_taller_lleg_all ON public.taller_llegadas;
CREATE POLICY aa_taller_lleg_all ON public.taller_llegadas FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()))
  WITH CHECK (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()));

DROP POLICY IF EXISTS aa_pensiones_staff ON public.pensiones;
CREATE POLICY aa_pensiones_staff ON public.pensiones FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS aa_pensiones_cfg ON public.pensiones_config;
CREATE POLICY aa_pensiones_cfg ON public.pensiones_config FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS aa_pensiones_log ON public.pensiones_import_log;
CREATE POLICY aa_pensiones_log ON public.pensiones_import_log FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion()) WITH CHECK (public.sie_es_staff_sesion());

DROP POLICY IF EXISTS aa_outbox ON public.asis_outbox;
CREATE POLICY aa_outbox ON public.asis_outbox FOR ALL TO anon, authenticated
  USING (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()))
  WITH CHECK (public.sie_es_staff_sesion() OR (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion()));

NOTIFY pgrst, 'reload schema';
