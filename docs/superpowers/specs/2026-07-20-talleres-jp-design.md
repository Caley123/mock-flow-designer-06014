# Spec: Módulo Talleres (Jean Piaget)

**Fecha:** 2026-07-20  
**Estado:** aprobado — plan en `docs/superpowers/plans/2026-07-20-talleres-jp.md`  
**Colegio:** solo Jean Piaget (`jeanpiaget.asiscole.com` / `/opt/sie-jp`) en la primera entrega  
**Enfoque:** tablas nuevas dedicadas (no mezclar con `arrivals` de jornada regular)

## 1. Problema

Hoy no existe un módulo de talleres. Solo hay una ventana horaria opcional (`tallerInicio` / `tallerFin`) en horarios de sección. Los padres ven en la libreta digital únicamente asistencia de clase. Se necesita un catálogo de talleres con inscripción, registro de llegada/salida/incidencia desde el escáner tutor, notificaciones WhatsApp con el mismo mapeo de chips JP, y visibilidad en el calendario de la libreta.

## 2. Decisiones acordadas

| Tema | Decisión |
|------|----------|
| Modelo | Catálogo real de talleres + alumnos inscritos |
| Quién registra | Tutor/portería, modo «Talleres» en el escáner actual |
| Inscripción | Admin/staff crea taller y asigna alumnos (lista fija) |
| Libreta padre | Mismo calendario; marcas distintas para taller |
| WhatsApp | Mismos flujos/cola/mapeo chips (relay JP) |
| Alcance deploy | Solo Jean Piaget primero |

## 3. Objetivos

1. Admin puede CRUD de talleres e inscripciones.
2. Tutor puede, en modo Talleres, registrar llegada, salida e incidencia de un alumno **inscrito** en el taller elegido.
3. Cada evento envía WhatsApp al apoderado (mismo pipeline que clase: cola `/wpp-notify`, mapa chip→teléfono, relay fijo).
4. El padre ve en la libreta (consulta de asistencia) los eventos de taller del día junto a la asistencia de clase.
5. San Ramón no se activa en esta entrega (código puede vivir en el monorepo, feature flag / deploy solo JP).

## 4. Fuera de alcance (v1)

- Rol separado «profesor de taller».
- Inscripción sin lista previa / walk-in forzado.
- Pestaña aparte «Talleres» en portal padres.
- KPIs/reportes Excel de talleres (salvo lo mínimo para admin listar registros).
- Activar módulo en San Ramón.
- Cambiar el mapeo de chips o la lógica de relay.

## 5. Modelo de datos (Supabase / JP)

### 5.1 `talleres`

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | uuid PK | |
| `nombre` | text not null | ej. «Fútbol», «Danza» |
| `descripcion` | text null | |
| `dia_semana` | smallint[] null | 0–6 o 1–7 (documentar en migración); opcional v1 |
| `hora_inicio` | time null | orientativo |
| `hora_fin` | time null | |
| `activo` | boolean default true | |
| `created_at` / `updated_at` | timestamptz | |

### 5.2 `taller_inscritos`

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | uuid PK | |
| `taller_id` | uuid FK → talleres | |
| `student_id` | int/uuid FK → estudiantes (mismo tipo que el resto del SIE) | |
| `activo` | boolean default true | |
| Unique | `(taller_id, student_id)` | |

### 5.3 `taller_asistencias`

Registro diario por alumno y taller (análogo a arrivals, separado).

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | uuid/bigserial PK | |
| `taller_id` | uuid FK | |
| `student_id` | FK | |
| `date` | date (Lima) | |
| `arrival_time` | text/time null | HH:mm Lima |
| `departure_time` | text/time null | |
| `arrival_status` | text null | ej. A tiempo / Tarde (reglas v1 simples o reutilizar umbral del taller) |
| `departure_type` | text null | si aplica (mismo vocabulario que salidas de clase si existe) |
| `registered_by` | uuid/text null | usuario staff |
| Unique | `(taller_id, student_id, date)` | upsert llegada/salida |

### 5.4 Incidencias de taller

**Opción elegida:** reutilizar tabla `incidents` (o equivalente actual) con columna nullable `taller_id`.  
Si `taller_id` no es null → incidencia de taller; WhatsApp y UI muestran nombre del taller.  
Evita duplicar catálogo de faltas y flujos de evidencia.

Migración: `alter table … add column taller_id uuid null references talleres(id)`.

### 5.5 RLS

- Staff autenticado (roles existentes admin/tutor según patrón SIE): CRUD talleres/inscritos; insert/update asistencias e incidencias.
- Padre (portal): SELECT de asistencias e incidencias de taller **solo** de sus hijos vinculados (mismo patrón RLS que arrivals/incidents).
- Sin acceso anónimo.

## 6. Servicios y tipos (frontend)

Nuevos (o extensión):

- `talleresService`: list/create/update/deactivate taller; list/add/remove inscritos; verificar inscripción.
- `tallerAttendanceService`: upsert llegada/salida; fetch por alumno+mes (portal); fetch del día por taller (escáner).
- Tipos en `src/types`: `Taller`, `TallerInscrito`, `TallerAsistencia`.
- Extender `Incident` con `tallerId?: string | null` y, al hidratar, `tallerNombre?`.

WhatsApp (`whatsappService`):

- Extender builders de mensaje de llegada/salida/incidencia para prefijo/contexto: `Taller: {nombre}`.
- Reutilizar `notifyParentArrival` / `notifyParentDeparture` / `notifyParentIncident` con metadata opcional `{ tallerId, tallerNombre }` **o** wrappers `notifyWorkshopArrival` que deleguen al mismo enqueue.
- No cambiar URL de cola ni secret; mismo mapeo chips JP.

## 7. UI

### 7.1 Admin — página Talleres

- Ruta staff (sidebar JP): listado, crear/editar, activar/desactivar.
- Detalle: lista de inscritos + buscador de alumnos para agregar/quitar.
- Solo visible / desplegado en JP (flag `VITE_TALLERES_ENABLED=true` en env build JP).

### 7.2 TutorScanner — modo Talleres

- Toggle o selector: **Clase | Talleres**.
- En Talleres: selector de taller activo → al escanear:
  - Si no inscrito → error claro, no registra.
  - Llegada / salida según fase o botones existentes adaptados.
  - Incidencia: flujo actual de faltas + `taller_id` en el alta.
- Tras guardar: WhatsApp en background (igual que hoy).

### 7.3 Libreta digital — `ParentAttendanceDashboard`

- Cargar en paralelo arrivals de clase + `taller_asistencias` del mes.
- Calendario único:
  - Celda: mantener estilo de clase; indicador adicional si hay taller ese día (punto/badge «T»).
  - Detalle del día: bloque clase (llegada/salida) + bloque(s) taller (`Taller: {nombre} · llegada … · salida …`).
- Incidencias de taller: si el dashboard o la libreta ya muestra incidencias, incluir las que tengan `taller_id` con etiqueta de taller; si no las muestra hoy, al menos en el detalle del día de asistencia.

## 8. Reglas de negocio v1

1. Un alumno puede estar en varios talleres.
2. Un registro de asistencia por `(taller, alumno, fecha)`.
3. Solo inscritos activos pueden escanearse en ese taller.
4. Mensajes WA: mismo anti-duplicado por día/tipo, clave distinta incluyendo `tallerId` para no colisionar con clase.
5. Horario `hora_inicio`/`hora_fin` del taller es informativo; «Tarde» puede usar ese `hora_inicio` como umbral o copiar lógica simple de clase.

## 9. Feature flag y deploy

- `VITE_TALLERES_ENABLED=true` solo en `.env.build` / Cloudflare de Jean Piaget.
- Migraciones SQL aplicadas al proyecto Supabase de JP.
- San Ramón: flag false / sin menú; no migrar obligatorio en v1 (o migrar schema sin exponer UI).

## 10. Criterios de aceptación

1. Admin JP crea taller «Fútbol» y asigna 3 alumnos.
2. Tutor en modo Talleres elige Fútbol, escanea inscrito → llegada guardada + WA encolado (202) con texto que menciona el taller.
3. Escaneo de no inscrito → rechazado.
4. Salida del mismo día actualiza el registro + WA salida con nombre de taller.
5. Incidencia con taller → guardada con `taller_id` + WA con falta/recomendación y nombre de taller.
6. Padre en consulta de asistencia ve el día con marca de taller y detalle llegada/salida del taller.
7. Con flag off (SR), no aparece menú ni modo Talleres.

## 11. Riesgos

- Duplicar lógica de escáner en `TutorScanner.tsx` (archivo grande): preferir hooks/helpers `useTallerScan` para no inflar más el monstruo.
- RLS padres: reutilizar patrón de vínculo padre–hijo existente; probar con usuario portal real JP.
- Anti-duplicado WA: debe discriminar clase vs taller.

## 12. Self-review

- [x] Sin placeholders «TBD» en decisiones clave.
- [x] No contradice: tablas nuevas + incidents con `taller_id`.
- [x] Alcance JP explícito; SR fuera.
- [x] WhatsApp = mismo mapeo, no nuevo proveedor.
- [ ] Pendiente usuario: confirmar tipo de `student_id` exacto en BD JP al escribir migración (int vs uuid) — se tomará del schema real en implementación.
