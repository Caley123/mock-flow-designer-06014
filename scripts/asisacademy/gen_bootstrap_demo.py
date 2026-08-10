#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import csv

out = Path(r"e:\mock-flow-designer-06014\scripts\asisacademy")
out.mkdir(parents=True, exist_ok=True)

real = []
with open(
    r"e:\mock-flow-designer-06014\scripts\fixtures\asisacademy\jp-5to-plus.csv",
    encoding="utf-8",
) as f:
    real = list(csv.DictReader(f))

invented_names = [
    "ALARCON RUIZ CAMILA SOFIA",
    "BENAVIDES TORRES LUIS ENRIQUE",
    "CASTRO MENDOZA ANA LUCIA",
    "DELGADO QUIROZ PEDRO ANTONIO",
    "ESPINOZA RAMOS MARIA FERNANDA",
    "FLORES AGUILAR DIEGO ANDRES",
    "GUTIERREZ SALAS VALERIA NICOLE",
    "HERRERA CAMPOS JORGE LUIS",
    "IBARRA LEON FIORELLA",
    "JIMENEZ PAREDES MATIAS",
    "LOPEZ CHAVEZ CAMILA",
    "MEJIA SILVA RODRIGO",
    "NAVARRO DIAZ PAULA",
    "ORTEGA VARGAS SEBASTIAN",
    "PONCE RIVERA ANDREA",
    "QUISPE MAMANI BRUNO",
    "ROJAS PALACIOS DANIELA",
    "SALAZAR CRUZ KEVIN",
    "TORRES HUAMAN MELANY",
    "UGARTE BRAVO NICOLAS",
    "VALDIVIA SOTO ANGIE",
    "YUPANQUI REYES FABRICIO",
    "ZAMORA LEON MARIA JOSE",
    "ACOSTA PINTO SAMUEL",
]


def esc(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


students_sql = []
used_codes = set()
used_phones = set()

for r in real:
    code = (r.get("codigo_barras") or "").strip()
    used_codes.add(code)
    tel = (r.get("telefono_contacto") or "").strip()
    if tel:
        used_phones.add(tel)
    tel_e = (r.get("telefono_emergencia") or "").strip() or None
    students_sql.append(
        "  ({code}, {name}, {grado}, {sec}, 'Secundaria'::nivel_educativo, "
        "{tel}, {email}, {resp}, {parent}, {emerg}, {pension})".format(
            code=esc(code),
            name=esc(r["nombre_completo"].strip()),
            grado=esc(r["grado"]),
            sec=esc(r["seccion"]),
            tel=esc(tel) if tel else "NULL",
            email=esc(r.get("email_contacto") or None),
            resp=esc(r.get("nombre_responsable") or None),
            parent=esc(r.get("parentesco_responsable") or None),
            emerg=esc(tel_e) if tel_e else "NULL",
            pension=esc(r.get("estado_pension") or "sin_dato"),
        )
    )

n = len(students_sql)
phone_base = 951200100
code_base = 92010000
for name in invented_names:
    if n >= 30:
        break
    n += 1
    seccion = "A" if n <= 18 else "B"
    code = str(code_base + n)
    while code in used_codes:
        code_base += 1
        code = str(code_base + n)
    used_codes.add(code)
    phone = str(phone_base + n)
    while phone in used_phones:
        phone_base += 1
        phone = str(phone_base + n)
    used_phones.add(phone)
    emerg = str(int(phone) + 50)
    students_sql.append(
        "  ({code}, {name}, '5to', {sec}, 'Secundaria'::nivel_educativo, "
        "{tel}, NULL, {resp}, 'Apoderado', {emerg}, 'sin_dato')".format(
            code=esc(code),
            name=esc(name),
            sec=esc(seccion),
            tel=esc(phone),
            resp=esc("Apoderado Demo"),
            emerg=esc(emerg),
        )
    )

assert len(students_sql) == 30, len(students_sql)
values = ",\n".join(students_sql)

sql = f"""-- =============================================================================
-- Asis Academy — Bootstrap + seed demo (30 alumnos)
-- Proyecto NUEVO de Supabase (NO ejecutar sobre Jean Piaget en produccion)
-- Pegar en: Supabase → SQL Editor → Run
-- Fuente alumnos reales: JP Secundaria grado <> 1ro (5to/6to). Resto inventado.
-- Telefonos de 1ro JP: NO usados. Inventados 95120xxxx para demos.
-- Usuarios demo password: 123456
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado_pension TEXT NOT NULL DEFAULT 'sin_dato'
    CHECK (estado_pension = ANY (ARRAY['al_dia','pendiente','moroso','sin_dato']))
);

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
  recomendacion TEXT NULL,
  CONSTRAINT catalogo_faltas_categoria_len CHECK (char_length(trim(categoria)) BETWEEN 1 AND 50)
);

CREATE TABLE IF NOT EXISTS public.talleres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  dia_semana INTEGER[],
  hora_inicio TIME,
  hora_fin TIME,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidencias (
  id_incidencia SERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  id_falta INTEGER NOT NULL REFERENCES public.catalogo_faltas(id_falta),
  fecha_hora_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_usuario_registro INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  nivel_reincidencia INTEGER NOT NULL DEFAULT 0,
  observaciones TEXT,
  estado_evidencia public.estado_evidencia NOT NULL DEFAULT 'Sin evidencia',
  cantidad_fotos INTEGER NOT NULL DEFAULT 0,
  id_usuario_carga_foto INTEGER REFERENCES public.usuarios(id_usuario),
  fecha_hora_carga_foto TIMESTAMPTZ,
  estado public.estado_incidencia NOT NULL DEFAULT 'Activa',
  motivo_anulacion TEXT,
  id_usuario_anulacion INTEGER REFERENCES public.usuarios(id_usuario),
  fecha_anulacion TIMESTAMPTZ,
  veces_impreso INTEGER NOT NULL DEFAULT 0,
  fecha_ultima_impresion TIMESTAMPTZ,
  taller_id UUID REFERENCES public.talleres(id)
);

CREATE TABLE IF NOT EXISTS public.evidencias_fotograficas (
  id_evidencia SERIAL PRIMARY KEY,
  id_incidencia INTEGER NOT NULL REFERENCES public.incidencias(id_incidencia),
  ruta_archivo TEXT NOT NULL,
  nombre_original TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  id_usuario_subida INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_subida VARCHAR(64),
  marca_agua_aplicada BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.comentarios_incidencias (
  id_comentario SERIAL PRIMARY KEY,
  id_incidencia INTEGER NOT NULL REFERENCES public.incidencias(id_incidencia),
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  texto_comentario TEXT NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registros_llegada (
  id_registro SERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  fecha DATE NOT NULL,
  hora_llegada TIME NOT NULL,
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('A tiempo', 'Tarde')),
  registrado_por INTEGER REFERENCES public.usuarios(id_usuario),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_salida TIME,
  registrado_salida_por INTEGER REFERENCES public.usuarios(id_usuario),
  fecha_salida TIMESTAMPTZ,
  tipo_salida VARCHAR(20) CHECK (tipo_salida IS NULL OR tipo_salida IN ('Normal', 'Autorizada', 'Sin registro'))
);

CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
  id_config SERIAL PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descripcion TEXT,
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
  id_usuario INTEGER REFERENCES public.usuarios(id_usuario),
  tabla_afectada VARCHAR(100) NOT NULL,
  id_registro INTEGER NOT NULL DEFAULT 0,
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  descripcion_accion TEXT,
  ip_address VARCHAR(64),
  user_agent TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.citas_padres (
  id_cita SERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  motivo VARCHAR(255) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente'
    CHECK (estado IN ('Pendiente','Confirmada','Reprogramada','Completada','No asistió','Cancelada')),
  asistencia BOOLEAN,
  llegada_tarde BOOLEAN,
  hora_llegada_real TIME,
  notas TEXT,
  id_usuario_creador INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.padres_estudiantes (
  id_relacion SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  parentesco VARCHAR(50) DEFAULT 'Apoderado',
  es_principal BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_sesiones (
  id_sesion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  rol TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tokens_recuperacion (
  id_token SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios(id_usuario),
  token_hash TEXT NOT NULL,
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.taller_inscritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES public.talleres(id),
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.taller_asistencias (
  id_registro BIGSERIAL PRIMARY KEY,
  taller_id UUID NOT NULL REFERENCES public.talleres(id),
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  fecha DATE NOT NULL,
  hora_llegada TEXT,
  hora_salida TEXT,
  estado TEXT CHECK (estado IS NULL OR estado IN ('A tiempo','Tarde')),
  tipo_salida TEXT CHECK (tipo_salida IS NULL OR tipo_salida IN ('Normal','Autorizada','Sin registro')),
  registrado_por INTEGER REFERENCES public.usuarios(id_usuario),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.taller_llegadas (
  id_registro BIGSERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  fecha DATE NOT NULL,
  hora_llegada TEXT NOT NULL,
  registrado_por INTEGER REFERENCES public.usuarios(id_usuario),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_salida TEXT
);

CREATE TABLE IF NOT EXISTS public.asis_outbox (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','salida','incidencia','aviso')),
  id_estudiante INTEGER NOT NULL,
  id_registro INTEGER NOT NULL,
  payload JSONB NOT NULL DEFAULT '{{}}'::jsonb,
  procesado BOOLEAN NOT NULL DEFAULT false,
  intentos INTEGER NOT NULL DEFAULT 0,
  ultimo_error TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  procesado_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.pensiones_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dia_vencimiento SMALLINT NOT NULL DEFAULT 10 CHECK (dia_vencimiento BETWEEN 1 AND 28),
  monto_mensual NUMERIC,
  moneda TEXT NOT NULL DEFAULT 'PEN',
  aviso_sonoro_activo BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by INTEGER REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.pensiones (
  id BIGSERIAL PRIMARY KEY,
  id_estudiante INTEGER NOT NULL REFERENCES public.estudiantes(id_estudiante),
  periodo TEXT NOT NULL CHECK (periodo ~ '^\\d{{4}}-\\d{{2}}$'),
  fecha_vencimiento DATE NOT NULL,
  pagado SMALLINT NOT NULL DEFAULT 0 CHECK (pagado IN (0, 1)),
  estado TEXT NOT NULL CHECK (estado IN ('pagado','pendiente','moroso')),
  monto NUMERIC,
  fecha_pago DATE,
  fuente TEXT NOT NULL DEFAULT 'banco_excel' CHECK (fuente IN ('banco_excel','banco_pdf','manual')),
  notas TEXT,
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  registrado_por INTEGER REFERENCES public.usuarios(id_usuario),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pensiones_import_log (
  id BIGSERIAL PRIMARY KEY,
  periodo TEXT NOT NULL,
  modo TEXT NOT NULL CHECK (modo IN ('pagaron','no_pagaron')),
  nombre_archivo TEXT,
  filas_leidas INTEGER NOT NULL DEFAULT 0,
  filas_ok INTEGER NOT NULL DEFAULT 0,
  filas_sin_match INTEGER NOT NULL DEFAULT 0,
  filas_ambiguas INTEGER NOT NULL DEFAULT 0,
  fuente TEXT NOT NULL DEFAULT 'banco_excel',
  importado_por INTEGER REFERENCES public.usuarios(id_usuario),
  importado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  detalle_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_estudiantes_codigo ON public.estudiantes (codigo_barras);
CREATE INDEX IF NOT EXISTS idx_estudiantes_nombre ON public.estudiantes (nombre_completo);
CREATE INDEX IF NOT EXISTS idx_registros_llegada_fecha ON public.registros_llegada (fecha);

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
  IF v_hash IS NULL THEN RETURN false; END IF;
  IF v_hash LIKE '$2a$%' OR v_hash LIKE '$2b$%' OR v_hash LIKE '$2y$%' THEN
    RETURN extensions.crypt(trim(p_password), v_hash) = v_hash;
  END IF;
  RETURN v_hash = trim(p_password);
END;
$$;

-- ===================== SEED =====================

INSERT INTO public.configuracion_sistema (clave, valor, descripcion) VALUES
  ('hora_limite_llegada', '08:00:00', 'Respaldo general'),
  ('hora_limite_llegada_primaria', '08:10:00', 'Limite Primaria'),
  ('hora_limite_llegada_secundaria', '08:10:00', 'Limite Secundaria'),
  ('hora_limite_salida', '14:45:00', 'Alerta sin salida'),
  ('hora_cierre_colegio', '18:00:00', 'Fuera de jornada'),
  ('categorias_faltas', '["Académica","Asistencia","Conducta","Puntualidad","Uniforme"]', 'Categorias faltas')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, descripcion = EXCLUDED.descripcion;

INSERT INTO public.configuracion_reincidencia (
  ventana_dias, puntos_falta_leve, puntos_falta_grave,
  umbral_nivel_1, umbral_nivel_2, umbral_nivel_3, umbral_nivel_4, umbral_nivel_5, activo
)
SELECT 60, 1, 2, 1, 3, 5, 8, 12, true
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_reincidencia WHERE activo);

INSERT INTO public.pensiones_config (id, dia_vencimiento, monto_mensual, moneda, aviso_sonoro_activo, activo)
VALUES (1, 10, 350.00, 'PEN', true, true)
ON CONFLICT (id) DO UPDATE SET
  dia_vencimiento = EXCLUDED.dia_vencimiento,
  monto_mensual = EXCLUDED.monto_mensual,
  activo = true;

INSERT INTO public.usuarios (username, password_hash, nombre_completo, email, rol, activo, cambio_password_obligatorio)
VALUES
  ('AdminAcademy', extensions.crypt('123456', extensions.gen_salt('bf')), 'Admin Asis Academy', 'admin@asisacademy.local', 'Admin', true, false),
  ('DirectorDemo', extensions.crypt('123456', extensions.gen_salt('bf')), 'Director Demo', 'director@asisacademy.local', 'Director', true, false),
  ('TutorDemo', extensions.crypt('123456', extensions.gen_salt('bf')), 'Tutor Demo', 'tutor@asisacademy.local', 'Tutor', true, false),
  ('Rudeus', extensions.crypt('123456', extensions.gen_salt('bf')), 'Rudeus Admin', 'rudeus@asisacademy.local', 'Admin', true, false)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  activo = true,
  cambio_password_obligatorio = false;

INSERT INTO public.catalogo_faltas (nombre_falta, categoria, es_grave, puntos_reincidencia, activo, orden_visualizacion, recomendacion)
SELECT * FROM (VALUES
  ('Asistió con buzo', 'Uniforme', false, 1, true, 1, 'Revisar reglamento de presentación personal.'),
  ('No porta el polo institucional', 'Uniforme', false, 1, true, 2, 'Verificar uniforme completo antes de salir de casa.'),
  ('Calzado no reglamentario', 'Uniforme', false, 1, true, 3, 'Usar calzado según normativa del colegio.'),
  ('Cabello fuera de la normativa', 'Conducta', false, 1, true, 4, 'Ajustar corte/peinado al reglamento.'),
  ('Peinado inadecuado', 'Uniforme', false, 1, true, 5, 'Acordar peinado acorde a la normativa.'),
  ('Tardanza reiterada', 'Asistencia', false, 1, true, 6, 'Ajustar horarios de salida de casa.'),
  ('Uso de prendas no autorizadas', 'Uniforme', false, 1, true, 7, 'Retirar prendas no reglamentarias.'),
  ('Uso de maquillaje', 'Conducta', false, 1, true, 8, 'Cumplir normas de presentación.'),
  ('Uñas fuera de la normativa', 'Uniforme', false, 1, true, 9, 'Ajustar presentación según reglamento.'),
  ('No porta carné institucional', 'Conducta', false, 1, true, 10, 'Portar carné todos los días.')
) AS v(nombre_falta, categoria, es_grave, puntos_reincidencia, activo, orden_visualizacion, recomendacion)
WHERE NOT EXISTS (SELECT 1 FROM public.catalogo_faltas LIMIT 1);

INSERT INTO public.estudiantes (
  codigo_barras, nombre_completo, grado, seccion, nivel_educativo,
  telefono_contacto, email_contacto, nombre_responsable, parentesco_responsable,
  telefono_emergencia, estado_pension, activo
) VALUES
{values}
ON CONFLICT (codigo_barras) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  grado = EXCLUDED.grado,
  seccion = EXCLUDED.seccion,
  telefono_contacto = EXCLUDED.telefono_contacto,
  telefono_emergencia = EXCLUDED.telefono_emergencia,
  estado_pension = EXCLUDED.estado_pension,
  activo = true;

INSERT INTO public.talleres (nombre, descripcion, dia_semana, hora_inicio, hora_fin, activo)
SELECT 'Taller Demo Deportes', 'Taller de prueba Asis Academy', ARRAY[2,4], '15:00', '17:00', true
WHERE NOT EXISTS (SELECT 1 FROM public.talleres WHERE nombre = 'Taller Demo Deportes');

INSERT INTO public.taller_inscritos (taller_id, id_estudiante, activo)
SELECT t.id, e.id_estudiante, true
FROM public.talleres t
CROSS JOIN LATERAL (
  SELECT id_estudiante FROM public.estudiantes WHERE activo ORDER BY id_estudiante LIMIT 10
) e
WHERE t.nombre = 'Taller Demo Deportes'
  AND NOT EXISTS (
    SELECT 1 FROM public.taller_inscritos ti
    WHERE ti.taller_id = t.id AND ti.id_estudiante = e.id_estudiante
  );

SELECT 'usuarios' AS tabla, count(*)::text AS n FROM public.usuarios
UNION ALL SELECT 'estudiantes', count(*)::text FROM public.estudiantes
UNION ALL SELECT 'faltas', count(*)::text FROM public.catalogo_faltas
UNION ALL SELECT 'talleres', count(*)::text FROM public.talleres;

SELECT public.validar_password('AdminAcademy', '123456') AS admin_ok,
       public.validar_password('TutorDemo', '123456') AS tutor_ok;

SELECT grado, seccion, count(*) FROM public.estudiantes GROUP BY 1,2 ORDER BY 1,2;
"""

path = out / "BOOTSTRAP_ASIS_ACADEMY_DEMO.sql"
path.write_text(sql, encoding="utf-8")
readme = out / "README.md"
readme.write_text(
    """# Asis Academy — script Supabase demo

## Archivo
`BOOTSTRAP_ASIS_ACADEMY_DEMO.sql`

## Cómo usarlo
1. Crea un **proyecto nuevo** en Supabase (no uses el de Jean Piaget en producción).
2. SQL Editor → pega el script → **Run**.
3. En el VPS `/opt/sie-academy/.env.build` pon la URL y anon key del proyecto nuevo.
4. Rebuild: `FORCE=1 SKIP_GIT=1 /opt/sie-academy/deploy.sh` (o el deploy que uses).

## Usuarios demo (password `123456`)
- `AdminAcademy` (Admin)
- `DirectorDemo` (Director)
- `TutorDemo` (Tutor)
- `Rudeus` (Admin)

## Alumnos
- 6 reales de JP (5to/6to, **sin 1ro**)
- 24 inventados en 5to A/B
- Teléfonos de 1ro JP **no** se usan
""",
    encoding="utf-8",
)
print("Wrote", path, path.stat().st_size)
print("students", len(students_sql))
