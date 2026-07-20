-- Jean Piaget: módulo talleres. id_estudiante = integer.

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

CREATE INDEX IF NOT EXISTS idx_taller_asistencias_estudiante_fecha
  ON public.taller_asistencias (id_estudiante, fecha);
CREATE INDEX IF NOT EXISTS idx_taller_inscritos_estudiante
  ON public.taller_inscritos (id_estudiante);

ALTER TABLE public.incidencias
  ADD COLUMN IF NOT EXISTS taller_id uuid NULL REFERENCES public.talleres(id) ON DELETE SET NULL;

ALTER TABLE public.talleres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taller_inscritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taller_asistencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sie_talleres_staff_all ON public.talleres;
CREATE POLICY sie_talleres_staff_all ON public.talleres FOR ALL TO anon, authenticated
  USING (public.sie_es_staff(public.sie_sesion_rol()))
  WITH CHECK (public.sie_es_staff(public.sie_sesion_rol()));

DROP POLICY IF EXISTS sie_taller_inscritos_staff_all ON public.taller_inscritos;
CREATE POLICY sie_taller_inscritos_staff_all ON public.taller_inscritos FOR ALL TO anon, authenticated
  USING (public.sie_es_staff(public.sie_sesion_rol()))
  WITH CHECK (public.sie_es_staff(public.sie_sesion_rol()));

DROP POLICY IF EXISTS sie_taller_asistencias_staff_all ON public.taller_asistencias;
CREATE POLICY sie_taller_asistencias_staff_all ON public.taller_asistencias FOR ALL TO anon, authenticated
  USING (public.sie_es_staff(public.sie_sesion_rol()))
  WITH CHECK (public.sie_es_staff(public.sie_sesion_rol()));

DROP POLICY IF EXISTS sie_talleres_tutor_select ON public.talleres;
CREATE POLICY sie_talleres_tutor_select ON public.talleres FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_taller_inscritos_tutor_select ON public.taller_inscritos;
CREATE POLICY sie_taller_inscritos_tutor_select ON public.taller_inscritos FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_taller_asist_tutor_ins ON public.taller_asistencias;
CREATE POLICY sie_taller_asist_tutor_ins ON public.taller_asistencias FOR INSERT TO anon, authenticated
  WITH CHECK (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_taller_asist_tutor_sel ON public.taller_asistencias;
CREATE POLICY sie_taller_asist_tutor_sel ON public.taller_asistencias FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_taller_asist_tutor_upd ON public.taller_asistencias;
CREATE POLICY sie_taller_asist_tutor_upd ON public.taller_asistencias FOR UPDATE TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion())
  WITH CHECK (public.sie_sesion_rol() = 'Tutor' AND public.sie_tiene_sesion());

DROP POLICY IF EXISTS sie_taller_asist_padre_sel ON public.taller_asistencias;
CREATE POLICY sie_taller_asist_padre_sel ON public.taller_asistencias FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Padre' AND public.sie_padre_puede_ver_estudiante(id_estudiante));

DROP POLICY IF EXISTS sie_talleres_padre_sel ON public.talleres;
CREATE POLICY sie_talleres_padre_sel ON public.talleres FOR SELECT TO anon, authenticated
  USING (public.sie_sesion_rol() = 'Padre' AND public.sie_tiene_sesion());
