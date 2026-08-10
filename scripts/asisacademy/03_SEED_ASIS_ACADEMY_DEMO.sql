-- =============================================================================
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

-- El 01 crea catalogo_faltas sin recomendacion; JP sí la tiene.
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
  ('76273860', 'Andre Mendez CIsneros', '5to', 'A', 'Secundaria'::nivel_educativo, '949261503', NULL, NULL, NULL, NULL, 'moroso'),
  ('81166552', 'Dayana Garcia', '5to', 'A', 'Secundaria'::nivel_educativo, NULL, NULL, NULL, NULL, NULL, 'moroso'),
  ('61708962', 'ENRIQUEZ QUISPE CLEIDY GIMENA', '5to', 'A', 'Secundaria'::nivel_educativo, '926764186', 'Junkuko@gmail.com', 'Junkuko', 'Novio', '947854586', 'moroso'),
  ('61383827', 'fabian mendez', '5to', 'A', 'Secundaria'::nivel_educativo, '949261503', NULL, NULL, NULL, '986895264', 'sin_dato'),
  ('76127901', 'HUAMANI ESPINOZA NICK REY YEFER', '5to', 'A', 'Secundaria'::nivel_educativo, '947854586', 'nickhuamaniespinoza@gmail.com', 'YEFER', 'Hermano', NULL, 'sin_dato'),
  ('70391919', 'Jeremi Isac Espino Escriba', '6to', 'B', 'Secundaria'::nivel_educativo, '900116737', NULL, NULL, NULL, NULL, 'moroso'),
  ('92010007', 'ALARCON RUIZ CAMILA SOFIA', '5to', 'A', 'Secundaria'::nivel_educativo, '951200107', NULL, 'Apoderado Demo', 'Apoderado', '951200157', 'sin_dato'),
  ('92010008', 'BENAVIDES TORRES LUIS ENRIQUE', '5to', 'A', 'Secundaria'::nivel_educativo, '951200108', NULL, 'Apoderado Demo', 'Apoderado', '951200158', 'sin_dato'),
  ('92010009', 'CASTRO MENDOZA ANA LUCIA', '5to', 'A', 'Secundaria'::nivel_educativo, '951200109', NULL, 'Apoderado Demo', 'Apoderado', '951200159', 'sin_dato'),
  ('92010010', 'DELGADO QUIROZ PEDRO ANTONIO', '5to', 'A', 'Secundaria'::nivel_educativo, '951200110', NULL, 'Apoderado Demo', 'Apoderado', '951200160', 'sin_dato'),
  ('92010011', 'ESPINOZA RAMOS MARIA FERNANDA', '5to', 'A', 'Secundaria'::nivel_educativo, '951200111', NULL, 'Apoderado Demo', 'Apoderado', '951200161', 'sin_dato'),
  ('92010012', 'FLORES AGUILAR DIEGO ANDRES', '5to', 'A', 'Secundaria'::nivel_educativo, '951200112', NULL, 'Apoderado Demo', 'Apoderado', '951200162', 'sin_dato'),
  ('92010013', 'GUTIERREZ SALAS VALERIA NICOLE', '5to', 'A', 'Secundaria'::nivel_educativo, '951200113', NULL, 'Apoderado Demo', 'Apoderado', '951200163', 'sin_dato'),
  ('92010014', 'HERRERA CAMPOS JORGE LUIS', '5to', 'A', 'Secundaria'::nivel_educativo, '951200114', NULL, 'Apoderado Demo', 'Apoderado', '951200164', 'sin_dato'),
  ('92010015', 'IBARRA LEON FIORELLA', '5to', 'A', 'Secundaria'::nivel_educativo, '951200115', NULL, 'Apoderado Demo', 'Apoderado', '951200165', 'sin_dato'),
  ('92010016', 'JIMENEZ PAREDES MATIAS', '5to', 'A', 'Secundaria'::nivel_educativo, '951200116', NULL, 'Apoderado Demo', 'Apoderado', '951200166', 'sin_dato'),
  ('92010017', 'LOPEZ CHAVEZ CAMILA', '5to', 'A', 'Secundaria'::nivel_educativo, '951200117', NULL, 'Apoderado Demo', 'Apoderado', '951200167', 'sin_dato'),
  ('92010018', 'MEJIA SILVA RODRIGO', '5to', 'A', 'Secundaria'::nivel_educativo, '951200118', NULL, 'Apoderado Demo', 'Apoderado', '951200168', 'sin_dato'),
  ('92010019', 'NAVARRO DIAZ PAULA', '5to', 'B', 'Secundaria'::nivel_educativo, '951200119', NULL, 'Apoderado Demo', 'Apoderado', '951200169', 'sin_dato'),
  ('92010020', 'ORTEGA VARGAS SEBASTIAN', '5to', 'B', 'Secundaria'::nivel_educativo, '951200120', NULL, 'Apoderado Demo', 'Apoderado', '951200170', 'sin_dato'),
  ('92010021', 'PONCE RIVERA ANDREA', '5to', 'B', 'Secundaria'::nivel_educativo, '951200121', NULL, 'Apoderado Demo', 'Apoderado', '951200171', 'sin_dato'),
  ('92010022', 'QUISPE MAMANI BRUNO', '5to', 'B', 'Secundaria'::nivel_educativo, '951200122', NULL, 'Apoderado Demo', 'Apoderado', '951200172', 'sin_dato'),
  ('92010023', 'ROJAS PALACIOS DANIELA', '5to', 'B', 'Secundaria'::nivel_educativo, '951200123', NULL, 'Apoderado Demo', 'Apoderado', '951200173', 'sin_dato'),
  ('92010024', 'SALAZAR CRUZ KEVIN', '5to', 'B', 'Secundaria'::nivel_educativo, '951200124', NULL, 'Apoderado Demo', 'Apoderado', '951200174', 'sin_dato'),
  ('92010025', 'TORRES HUAMAN MELANY', '5to', 'B', 'Secundaria'::nivel_educativo, '951200125', NULL, 'Apoderado Demo', 'Apoderado', '951200175', 'sin_dato'),
  ('92010026', 'UGARTE BRAVO NICOLAS', '5to', 'B', 'Secundaria'::nivel_educativo, '951200126', NULL, 'Apoderado Demo', 'Apoderado', '951200176', 'sin_dato'),
  ('92010027', 'VALDIVIA SOTO ANGIE', '5to', 'B', 'Secundaria'::nivel_educativo, '951200127', NULL, 'Apoderado Demo', 'Apoderado', '951200177', 'sin_dato'),
  ('92010028', 'YUPANQUI REYES FABRICIO', '5to', 'B', 'Secundaria'::nivel_educativo, '951200128', NULL, 'Apoderado Demo', 'Apoderado', '951200178', 'sin_dato'),
  ('92010029', 'ZAMORA LEON MARIA JOSE', '5to', 'B', 'Secundaria'::nivel_educativo, '951200129', NULL, 'Apoderado Demo', 'Apoderado', '951200179', 'sin_dato'),
  ('92010030', 'ACOSTA PINTO SAMUEL', '5to', 'B', 'Secundaria'::nivel_educativo, '951200130', NULL, 'Apoderado Demo', 'Apoderado', '951200180', 'sin_dato')
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
