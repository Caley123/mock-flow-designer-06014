#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera SEED_ASIS_ACADEMY_DEMO.sql (solo datos, sin DDL)."""
from pathlib import Path
import csv

out = Path(r"e:\mock-flow-designer-06014\scripts\asisacademy")
real = list(
    csv.DictReader(
        open(
            r"e:\mock-flow-designer-06014\scripts\fixtures\asisacademy\jp-5to-plus.csv",
            encoding="utf-8",
        )
    )
)

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

assert len(students_sql) == 30
values = ",\n".join(students_sql)

sql = f"""-- =============================================================================
-- Asis Academy — SEED demo (30 alumnos)
-- Ejecutar DESPUES de:
--   1) 01_SIE_CORE_RPC.sql
--   2) 02_TALLERES_PENSIONES_TABLES.sql  (y opcional PENSIONES_JP.sql / talleres RPCs)
-- Proyecto NUEVO de Supabase (NO sobre Jean Piaget produccion)
-- =============================================================================

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

-- Password demo: 123456
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

ALTER TABLE public.catalogo_faltas
  ADD COLUMN IF NOT EXISTS recomendacion TEXT NULL;

INSERT INTO public.catalogo_faltas (nombre_falta, categoria, es_grave, puntos_reincidencia, activo, orden_visualizacion, descripcion, recomendacion)
SELECT * FROM (VALUES
  ('Asistió con buzo', 'Uniforme', false, 1, true, 1, 'Uniforme incompleto', 'Revisar reglamento de presentación personal.'),
  ('No porta el polo institucional', 'Uniforme', false, 1, true, 2, 'Falta polo', 'Verificar uniforme completo antes de salir de casa.'),
  ('Calzado no reglamentario', 'Uniforme', false, 1, true, 3, 'Calzado', 'Usar calzado según normativa del colegio.'),
  ('Cabello fuera de la normativa', 'Conducta', false, 1, true, 4, 'Cabello', 'Ajustar corte/peinado al reglamento.'),
  ('Peinado inadecuado', 'Uniforme', false, 1, true, 5, 'Peinado', 'Acordar peinado acorde a la normativa.'),
  ('Tardanza reiterada', 'Asistencia', false, 1, true, 6, 'Tardanza', 'Ajustar horarios de salida de casa.'),
  ('Uso de prendas no autorizadas', 'Uniforme', false, 1, true, 7, 'Prendas', 'Retirar prendas no reglamentarias.'),
  ('Uso de maquillaje', 'Conducta', false, 1, true, 8, 'Maquillaje', 'Cumplir normas de presentación.'),
  ('Uñas fuera de la normativa', 'Uniforme', false, 1, true, 9, 'Uñas', 'Ajustar presentación según reglamento.'),
  ('No porta carné institucional', 'Conducta', false, 1, true, 10, 'Carné', 'Portar carné todos los días.')
) AS v(nombre_falta, categoria, es_grave, puntos_reincidencia, activo, orden_visualizacion, descripcion, recomendacion)
WHERE NOT EXISTS (SELECT 1 FROM public.catalogo_faltas LIMIT 1);

INSERT INTO public.estudiantes (
  codigo_barras, nombre_completo, grado, seccion, nivel_educativo,
  telefono_contacto, email_contacto, nombre_responsable, parentesco_responsable,
  telefono_emergencia, estado_pension
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

NOTIFY pgrst, 'reload schema';
"""

path = out / "03_SEED_ASIS_ACADEMY_DEMO.sql"
path.write_text(sql, encoding="utf-8")
print("Wrote", path, "students", len(students_sql))
