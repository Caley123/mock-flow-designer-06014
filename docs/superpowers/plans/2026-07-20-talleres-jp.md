# Talleres Jean Piaget — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Módulo de talleres en Jean Piaget: catálogo + inscripción, asistencia/salida/incidencia desde el escáner tutor, WhatsApp con el mapeo de chips actual, y marcas en la libreta digital del padre.

**Architecture:** Tablas nuevas `talleres`, `taller_inscritos`, `taller_asistencias` (separadas de `registros_llegada`). Incidencias reutilizan `incidencias` con `taller_id` nullable. Feature flag `VITE_TALLERES_ENABLED`. WhatsApp reutiliza `whatsappService` + cola `/wpp-notify` con contexto de taller en el texto y dedupe por `tallerId`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind/shadcn, Supabase (Postgres + RLS), Vitest, cola WPPConnect existente.

**Spec:** `docs/superpowers/specs/2026-07-20-talleres-jp-design.md`

## Global Constraints

- Solo activar UI/flag en Jean Piaget (`VITE_TALLERES_ENABLED=true`); San Ramón queda `false` / ausente.
- `student_id` / `id_estudiante` es **integer** (ver `Student.id: number`).
- No mezclar asistencias de taller en `registros_llegada`.
- No cambiar mapeo de chips ni relay WhatsApp.
- UI y mensajes en español.
- Zona horaria Lima para fechas (`getLimaTodayDate` / `getLimaNow`).
- Commits frecuentes por tarea (solo si el usuario lo pidió en esa sesión; si no, dejar cambios listos).

---

## File map

| Archivo | Rol |
|---------|-----|
| `scripts/TALLERES_JP.sql` | DDL + RLS JP |
| `src/config/features.ts` | `isTalleresEnabled()` |
| `src/types/index.ts` | `Taller`, `TallerInscrito`, `TallerAsistencia`; `Incident.tallerId` |
| `src/lib/utils/tallerArrivalStatus.ts` | Umbral A tiempo / Tarde |
| `src/lib/services/talleresService.ts` | CRUD talleres + inscritos |
| `src/lib/services/tallerAttendanceService.ts` | Upsert llegada/salida + fetch mes |
| `src/lib/services/incidentsService.ts` | `create` acepta `tallerId` |
| `src/lib/services/whatsappService.ts` | Mensajes + dedupe con taller |
| `src/lib/services/index.ts` | Exports |
| `src/pages/TalleresAdmin.tsx` | Admin CRUD + inscritos |
| `src/config/staffNavigation.ts` | Nav «Talleres» si flag |
| `src/App.tsx` | Ruta `/talleres` |
| `src/pages/TutorScanner.tsx` + `src/hooks/useTallerScan.ts` | Modo Talleres |
| `src/lib/utils/parentAttendanceCalendar.ts` | Badge T + detalle día |
| `src/components/parent/ParentAttendanceDashboard.tsx` | Carga asistencias taller |
| `src/vite-env.d.ts` | Tipo env |
| Tests Vitest junto a utils/servicios puros | |

---

### Task 1: Feature flag y tipos

**Files:**
- Create: `src/config/features.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/types/index.ts` (después de `ArrivalRecord`)
- Test: `src/config/features.test.ts`

**Interfaces:**
- Produces: `parseTalleresEnabled(raw)`, `isTalleresEnabled()`; tipos `Taller`, `TallerInscrito`, `TallerAsistencia`; `Incident.tallerId` / `tallerNombre`

- [ ] **Step 1: Write failing test**

```ts
// src/config/features.test.ts
import { describe, expect, it } from 'vitest';
import { parseTalleresEnabled } from './features';

describe('parseTalleresEnabled', () => {
  it('es true solo con "true"', () => {
    expect(parseTalleresEnabled('true')).toBe(true);
  });
  it('es false por defecto', () => {
    expect(parseTalleresEnabled(undefined)).toBe(false);
    expect(parseTalleresEnabled('')).toBe(false);
    expect(parseTalleresEnabled('false')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/config/features.test.ts
```

- [ ] **Step 3: Implement flag + types**

```ts
// src/config/features.ts
export function parseTalleresEnabled(raw: string | undefined): boolean {
  return raw === 'true';
}

export function isTalleresEnabled(): boolean {
  return parseTalleresEnabled(import.meta.env.VITE_TALLERES_ENABLED);
}
```

En `vite-env.d.ts` añadir:
```ts
readonly VITE_TALLERES_ENABLED?: string;
```

En `types/index.ts` tras `ArrivalRecord`:

```ts
export interface Taller {
  id: string;
  nombre: string;
  descripcion: string | null;
  diaSemana: number[] | null; // 1=Lun … 7=Dom
  horaInicio: string | null; // HH:mm
  horaFin: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TallerInscrito {
  id: string;
  tallerId: string;
  studentId: number;
  activo: boolean;
  student?: Student;
}

export interface TallerAsistencia {
  id: number;
  tallerId: string;
  tallerNombre?: string;
  studentId: number;
  date: string;
  arrivalTime: string | null;
  departureTime: string | null;
  arrivalStatus: 'A tiempo' | 'Tarde' | null;
  departureType: 'Normal' | 'Autorizada' | 'Sin registro' | null;
  registeredBy: number | null;
}
```

En `Incident` añadir:
```ts
tallerId?: string | null;
tallerNombre?: string | null;
```

- [ ] **Step 4: Run tests — PASS**

```bash
npx vitest run src/config/features.test.ts
```

- [ ] **Step 5: Commit** (solo si el usuario lo pidió)

```bash
git add src/config/features.ts src/config/features.test.ts src/vite-env.d.ts src/types/index.ts
git commit -m "feat(talleres): flag VITE_TALLERES_ENABLED y tipos"
```

---

### Task 2: Migración SQL + RLS (JP)

**Files:**
- Create: `scripts/TALLERES_JP.sql`

**Interfaces:**
- Produces: tablas `talleres`, `taller_inscritos`, `taller_asistencias`; columna `incidencias.taller_id`; policies staff ALL + tutor + padre SELECT

- [ ] **Step 1: Write `scripts/TALLERES_JP.sql`**

```sql
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
```

- [ ] **Step 2: Apply on Supabase JP** and verify:

```sql
SELECT to_regclass('public.talleres'), to_regclass('public.taller_asistencias');
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'incidencias' AND column_name = 'taller_id';
```

Expected: tablas presentes; columna `taller_id` existe.

- [ ] **Step 3: Commit**

```bash
git add scripts/TALLERES_JP.sql
git commit -m "feat(talleres): migración SQL y RLS Jean Piaget"
```

---

### Task 3: Umbral de llegada de taller

**Files:**
- Create: `src/lib/utils/tallerArrivalStatus.ts`
- Test: `src/lib/utils/tallerArrivalStatus.test.ts`

**Interfaces:**
- Produces: `resolveTallerArrivalStatus(arrivalHHmm, tallerHoraInicio): 'A tiempo' | 'Tarde'`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { resolveTallerArrivalStatus } from './tallerArrivalStatus';

describe('resolveTallerArrivalStatus', () => {
  it('sin hora de taller → A tiempo', () => {
    expect(resolveTallerArrivalStatus('16:10', null)).toBe('A tiempo');
  });
  it('antes o igual → A tiempo', () => {
    expect(resolveTallerArrivalStatus('15:30', '15:30')).toBe('A tiempo');
    expect(resolveTallerArrivalStatus('15:29', '15:30')).toBe('A tiempo');
  });
  it('después → Tarde', () => {
    expect(resolveTallerArrivalStatus('15:31', '15:30')).toBe('Tarde');
  });
});
```

- [ ] **Step 2:** `npx vitest run src/lib/utils/tallerArrivalStatus.test.ts` — FAIL

- [ ] **Step 3: Implement**

```ts
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

export function resolveTallerArrivalStatus(
  arrivalHHmm: string,
  tallerHoraInicio: string | null,
): 'A tiempo' | 'Tarde' {
  if (!tallerHoraInicio?.trim()) return 'A tiempo';
  return toMinutes(arrivalHHmm) > toMinutes(tallerHoraInicio) ? 'Tarde' : 'A tiempo';
}
```

- [ ] **Step 4:** Vitest PASS — **Step 5: Commit** `feat(talleres): umbral A tiempo/Tarde`

---

### Task 4: `talleresService`

**Files:**
- Create: `src/lib/services/talleresService.ts`
- Modify: `src/lib/services/index.ts`
- Test: `src/lib/services/talleresService.mappers.test.ts`

**Interfaces:**
- Produces: `mapTallerRow`; `talleresService.listActive|listAll|create|update|setActivo|listInscritos|addInscrito|removeInscrito|isStudentInscrito`

- [ ] **Step 1: Mapper test** — nombre, `hora_inicio` → `horaInicio` truncado a `HH:mm`

- [ ] **Step 2: Implement** con `supabase.from('talleres'|'taller_inscritos')`.  
  `isStudentInscrito`: `.eq('activo', true).maybeSingle()` → boolean.

- [ ] **Step 3: Export** en `index.ts`

- [ ] **Step 4: Vitest PASS** — **Step 5: Commit** `feat(talleres): talleresService`

---

### Task 5: `tallerAttendanceService`

**Files:**
- Create: `src/lib/services/tallerAttendanceService.ts`
- Modify: `src/lib/services/index.ts`

**Interfaces:**
- Consumes: `resolveTallerArrivalStatus`, `getLimaTodayDate`, `getLimaMonthBounds`
- Produces: `recordArrival`, `recordDeparture`, `fetchMonthForStudent`

Upsert llegada:

```ts
await supabase.from('taller_asistencias').upsert(
  {
    taller_id: tallerId,
    id_estudiante: studentId,
    fecha,
    hora_llegada: hora,
    estado,
    registrado_por: registeredBy,
  },
  { onConflict: 'taller_id,id_estudiante,fecha' },
);
```

Salida: update `hora_salida` / `tipo_salida` (default `'Normal'`).  
Fetch mes: join `talleres(nombre)` → `tallerNombre`.

- [ ] Implement + export + smoke mapper test — Commit `feat(talleres): tallerAttendanceService`

---

### Task 6: Incidencias con `tallerId`

**Files:**
- Modify: `src/lib/services/incidentsService.ts`

**Interfaces:**
- `create({ studentId, faultTypeId, registeredBy, observations?, tallerId? })` inserta `taller_id` si viene.

```ts
...(incident.tallerId ? { taller_id: incident.tallerId } : {}),
```

Mapear `taller_id` → `tallerId` en respuestas minimal/full.

- [ ] Commit `feat(talleres): incidencias.taller_id en create`

---

### Task 7: WhatsApp con contexto taller

**Files:**
- Modify: `src/lib/services/whatsappService.ts`
- Create: helpers exportables + `src/lib/services/whatsappTallerNotify.test.ts`

**Interfaces:**
- `NotifyOpts = { tallerId?: string; tallerNombre?: string }`
- `buildNotifyDedupKey(kind, studentId, date, opts?)`
- `notifyParentArrival|Departure|Incident(..., opts?: NotifyOpts)`
- Mensajes incluyen `*Taller:* {nombre}` cuando hay `tallerNombre`
- Dedupe: `taller:{tallerId}:{kind}:{studentId}:{date}` vs clave de clase actual

```ts
export function buildNotifyDedupKey(
  kind: 'arrival' | 'departure' | 'incident',
  studentId: number,
  date: string,
  opts?: { tallerId?: string; incidentId?: number },
): string {
  if (kind === 'incident' && opts?.incidentId != null) {
    return `incident:${studentId}:${opts.incidentId}`;
  }
  if (opts?.tallerId) {
    return `taller:${opts.tallerId}:${kind}:${studentId}:${date.slice(0, 10)}`;
  }
  return `${kind}:${studentId}:${date.slice(0, 10)}`;
}
```

- [ ] Tests del key + builder — Vitest PASS — Commit `feat(talleres): WhatsApp taller + dedupe`

---

### Task 8: Admin UI + nav + ruta

**Files:**
- Create: `src/pages/TalleresAdmin.tsx`
- Modify: `src/config/staffNavigation.ts`, `src/App.tsx`, `src/lib/routePreloads.ts` (si aplica)

**Interfaces:**
- Nav item `/talleres` filtrado con `isTalleresEnabled()`
- Roles: Supervisor, Director, Admin
- UI: listado, crear/editar, inscritos via `studentsService` + `talleresService`

```ts
if (item.path === '/talleres' && !isTalleresEnabled()) return false;
```

- [ ] Commit `feat(talleres): admin CRUD e inscripción`

---

### Task 9: Escáner tutor — modo Talleres

**Files:**
- Create: `src/hooks/useTallerScan.ts`
- Modify: `src/pages/TutorScanner.tsx`

**Interfaces:**
- `scanMode: 'clase' | 'taller'`, `selectedTallerId`
- `handleTallerArrival/Departure(student)` → check inscrito → record → `notifyParent*(…, { tallerId, tallerNombre })`
- Incidencia: `incidentsService.create({…, tallerId})` + `notifyParentIncident(…, opts)`

Solo UI toggle si `isTalleresEnabled()`.

- [ ] Commit `feat(talleres): modo Talleres en TutorScanner`

---

### Task 10: Libreta digital (padre)

**Files:**
- Modify: `src/lib/utils/parentAttendanceCalendar.ts` (+ test)
- Modify: `src/components/parent/ParentAttendanceDashboard.tsx`

**Interfaces:**
- `dayHasTaller(map, dayKey): boolean`
- `formatTallerDayDetail(rows: TallerAsistencia[]): string[]`
- Dashboard carga `fetchMonthForStudent` solo si `isTalleresEnabled()`
- Celda: badge «T»; detalle: bloque clase + líneas de taller
- Asistencia de clase no se anula por taller

- [ ] Vitest — Commit `feat(talleres): libreta digital con asistencia de taller`

---

### Task 11: Activar build JP

**Files / ops:**
- `/opt/sie-jp/.env.build` o env Cloudflare JP: `VITE_TALLERES_ENABLED=true`
- SR sin flag o `false`
- Aplicar SQL en Supabase JP si falta
- Rebuild/deploy JP
- Smoke: criterios §10 de la spec

- [ ] Opcional: comentar en `.env.example`  
- [ ] No activar San Ramón

---

## Spec coverage

| Spec | Task |
|------|------|
| CRUD + inscritos | 4, 8 |
| Escáner | 9 |
| Llegada/salida + WA | 5, 7, 9 |
| Incidencia + WA | 6, 7, 9 |
| Libreta | 10 |
| Flag solo JP | 1, 8, 11 |
| SQL/RLS | 2 |
| Umbral | 3 |

## Self-review

- Tipos: uuid string / `studentId` number consistentes.
- Dedup incluye `tallerId`.
- Sin placeholders TBD en pasos ejecutables.
- `notifyParentIncident` recibe `NotifyOpts` (Tasks 7 y 9).
