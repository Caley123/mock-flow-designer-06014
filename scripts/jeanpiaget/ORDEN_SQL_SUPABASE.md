# Orden SQL — Supabase Jean Piaget (base nueva)

Ejecutar en el **SQL Editor** del proyecto Supabase de Jean Piaget, **en este orden**.
No copies datos de alumnos de Asiscole: solo estructura.

> Si algún script falla porque “ya existe”, sigue. Anota errores reales (permisos, relaciones).

## 1. Núcleo auth / RLS / sesiones

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `scripts/RLS_COMPLETO_SIE.sql` | Sesiones, helpers rol, políticas RLS principales |
| 2 | `scripts/PATCH_LOGIN_PGCrypto.sql` | Login con bcrypt |
| 3 | `FUNCION_VALIDAR_PASSWORD_BCRYPT.sql` | Validación password (si no está en el anterior) |
| 4 | `AGREGAR_ROL_PADRE.sql` | Rol Padre (si no está en RLS completo) |

## 2. Estudiantes y tutor

| # | Archivo |
|---|---------|
| 5 | `scripts/RLS_ESTUDIANTES_SESIONES.sql` |
| 6 | `scripts/PATCH_ESTUDIANTES_PAGINADO.sql` |
| 7 | `scripts/PATCH_BUSQUEDA_NOMBRE_V2.sql` |
| 8 | `ACTUALIZAR_ESTUDIANTES_CONTACTO.sql` |

## 3. Llegadas / salidas / portal público

| # | Archivo |
|---|---------|
| 9 | `ACTUALIZAR_REGISTROS_LLEGADA_SALIDAS.sql` |
| 10 | `PUBLIC_PORTAL_PADRES.sql` |
| 11 | `scripts/PATCH_LIMITES_LLEGADA_NIVEL.sql` |
| 12 | `scripts/DIAS_NO_LECTIVOS_2026.sql` |

## 4. Incidencias / reincidencia / justificadas

| # | Archivo |
|---|---------|
| 13 | `SOLUCION_COMPLETA_REINCIDENCIA.sql` |
| 14 | `AGREGAR_ESTADO_JUSTIFICADA_COMPLETO.sql` (o PASO1+PASO2) |
| 15 | `scripts/PATCH_INCIDENCIAS_TUTOR.sql` |

## 5. Citas padres / storage / auditoría

| # | Archivo |
|---|---------|
| 16 | `CREAR_TABLA_CITAS_PADRES.sql` |
| 17 | `ACTUALIZAR_CITAS_PADRES_LLEGADA_TARDE.sql` o `scripts/PATCH_CITAS_LLEGADA_TARDE.sql` |
| 18 | `CREAR_PADRES_ESTUDIANTES.sql` |
| 19 | `CREAR_BUCKETS_STORAGE.sql` |
| 20 | `scripts/PATCH_AUDITORIA_RLS_V2.sql` |
| 21 | `scripts/PATCH_VISTAS_SECURITY_INVOKER.sql` |
| 22 | `HORARIOS_POR_SECCION.sql` (si usan horario por salón) |

## 6. Config mínima de horarios

```sql
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('hora_limite_llegada', '08:00:00', 'Respaldo legado (no usar para Prim/Sec)'),
  ('hora_limite_llegada_primaria', '08:00:00', 'Límite Primaria'),
  ('hora_limite_llegada_secundaria', '07:40:00', 'Límite Secundaria — ajustar'),
  ('hora_limite_salida', '13:30:00', 'Alertas de salida'),
  ('hora_cierre_colegio', '18:00:00', 'Fuera de jornada en escáner')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
```

> Si la tabla no tiene UNIQUE en `clave`, usa upsert manual o el formulario de Configuración del sistema en la app.

## 7. Primer usuario Admin

Crear el Admin desde tu flujo habitual del SIE (script de usuarios / panel).
**No** reutilices usuarios ni teléfonos de Asiscole.

## Verificación rápida

```sql
SELECT clave, valor FROM configuracion_sistema ORDER BY clave;
SELECT count(*) AS feriados FROM dias_no_lectivos WHERE anio_escolar = 2026;
SELECT public.sie_es_dia_lectivo(current_date);
```

Luego en la app JP: login Admin → Configuración → ajustar límites Prim/Sec.
