# Pensiones Jean Piaget — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Módulo de pensiones en Jean Piaget: estados por mes, import Excel en memoria (sin Storage), aviso sonoro en TutorScanner si moroso, historial anual staff/padre.

**Architecture:** Tabla `pensiones` (upsert por `id_estudiante`+`periodo`), config singleton, log de import solo metadatos, cache `estudiantes.estado_pension`. Parser Excel en cliente (ExcelJS + ArrayBuffer) → RPC `sie_pensiones_upsert_lote`. Feature flag `VITE_PENSIONES_ENABLED`. PDF fuera de v1.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind/shadcn, Supabase (Postgres + RLS + RPC sesión SIE), ExcelJS, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-30-pensiones-jp-design.md`

## Global Constraints

- Solo activar UI/flag en Jean Piaget (`VITE_PENSIONES_ENABLED=true`); San Ramón queda `false` / ausente.
- `id_estudiante` es **integer** (`Student.id: number`).
- **Nunca** subir Excel/PDF a Supabase Storage ni guardar blob en disco/BD.
- Pitido = aviso; **no** bloquea asistencia/taller.
- Periodo `YYYY-MM`; vencimiento default día **10** (configurable).
- UI y mensajes en español; fechas con zona Lima (`getLimaTodayDate` / `getLimaNow`).
- Servicios en `src/lib/services/`; páginas no llaman Supabase directo.
- Commits solo si el usuario lo pide en la sesión; si no, dejar cambios listos.
- No tocar rotación ingest key / rate limit en este plan.

---

## File map

| Archivo | Rol |
|---------|-----|
| `scripts/PENSIONES_JP.sql` | DDL + RLS + triggers + RPCs |
| `src/config/features.ts` | `isPensionesEnabled()` |
| `src/vite-env.d.ts` | `VITE_PENSIONES_ENABLED` |
| `src/types/index.ts` | Tipos pensión; `Student.estadoPension` |
| `src/lib/utils/pensionesExcelParser.ts` | Detectar columnas + filas desde ArrayBuffer |
| `src/lib/utils/pensionesMatch.ts` | Match DNI/nombre |
| `src/lib/utils/pensionPeriod.ts` | Periodo actual, vencimiento, transición estado |
| `src/lib/utils/pensionBeep.ts` | Audio aviso moroso |
| `public/sounds/pension-moroso.mp3` | Asset corto (o generar beep vía Web Audio sin archivo) |
| `src/lib/services/pensionesService.ts` | RPC/list/config/historial |
| `src/lib/services/studentsService.ts` | Mapear `estadoPension` desde RPC |
| `src/pages/PensionesAdmin.tsx` | Import + listado + config |
| `src/components/pensiones/PensionYearGrid.tsx` | Historial 12 meses |
| `src/config/staffNavigation.ts` | Nav Pensiones (Director/Admin) si flag |
| `src/App.tsx` | Ruta `/pensiones` |
| `src/pages/TutorScanner.tsx` | Beep + badge si moroso |
| Portal padre (componente existente o sección nueva) | Lectura historial hijo |
| Tests Vitest junto a utils | |

---

### Task 1: Feature flag y tipos

**Files:**
- Modify: `src/config/features.ts`
- Modify: `src/config/features.test.ts` (crear si no cubre pensiones)
- Modify: `src/vite-env.d.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `parsePensionesEnabled`, `isPensionesEnabled`; tipos abajo; `Student.estadoPension?`

- [ ] **Step 1: Write failing tests**

```ts
// src/config/features.test.ts (añadir)
import { parsePensionesEnabled } from './features';

describe('parsePensionesEnabled', () => {
  it('es true solo con "true"', () => {
    expect(parsePensionesEnabled('true')).toBe(true);
  });
  it('es false por defecto', () => {
    expect(parsePensionesEnabled(undefined)).toBe(false);
    expect(parsePensionesEnabled('false')).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/config/features.test.ts
```

- [ ] **Step 3: Implement**

```ts
// features.ts — añadir
export function parsePensionesEnabled(raw: string | undefined): boolean {
  return raw === 'true';
}

export function isPensionesEnabled(): boolean {
  return parsePensionesEnabled(import.meta.env.VITE_PENSIONES_ENABLED);
}
```

En `vite-env.d.ts`: `readonly VITE_PENSIONES_ENABLED?: string;`

En `types/index.ts`:

```ts
export type PensionEstado = 'pagado' | 'pendiente' | 'moroso';
export type EstudianteEstadoPension = 'al_dia' | 'pendiente' | 'moroso' | 'sin_dato';
export type PensionFuente = 'banco_excel' | 'banco_pdf' | 'manual';
export type PensionImportModo = 'pagaron' | 'no_pagaron';

export interface PensionRow {
  id: number;
  idEstudiante: number;
  periodo: string; // YYYY-MM
  fechaVencimiento: string; // YYYY-MM-DD
  estado: PensionEstado;
  monto: number | null;
  fechaPago: string | null;
  fuente: PensionFuente;
  notas: string | null;
  registradoEn: string;
}

export interface PensionConfig {
  diaVencimiento: number;
  moneda: string;
  avisoSonoroActivo: boolean;
}

export interface PensionImportPreviewRow {
  rowIndex: number;
  rawDni: string | null;
  rawNombre: string | null;
  monto: number | null;
  fechaPago: string | null;
  matchStatus: 'ok' | 'sin_match' | 'ambiguo';
  idEstudiante: number | null;
  nombreMatched: string | null;
}
```

Añadir a `Student`: `estadoPension?: EstudianteEstadoPension;`

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/config/features.test.ts
```

- [ ] **Step 5: Commit** (solo si el usuario lo pidió)

```bash
git add src/config/features.ts src/config/features.test.ts src/vite-env.d.ts src/types/index.ts
git commit -m "feat(pensiones): flag VITE_PENSIONES_ENABLED y tipos"
```

---

### Task 2: Utilidades de periodo y estado

**Files:**
- Create: `src/lib/utils/pensionPeriod.ts`
- Create: `src/lib/utils/pensionPeriod.test.ts`

**Interfaces:**
- Consumes: tipos `PensionEstado`
- Produces: `periodoFromDate`, `fechaVencimientoForPeriodo`, `estadoTrasImportNoPago`, `cacheEstadoFromPension`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  periodoFromDate,
  fechaVencimientoForPeriodo,
  estadoTrasImportNoPago,
  cacheEstadoFromPension,
} from './pensionPeriod';

describe('pensionPeriod', () => {
  it('formatea YYYY-MM', () => {
    expect(periodoFromDate(new Date(2026, 6, 30))).toBe('2026-07');
  });

  it('vencimiento día 10', () => {
    expect(fechaVencimientoForPeriodo('2026-07', 10)).toBe('2026-07-10');
  });

  it('no pagó después de vencimiento → moroso', () => {
    expect(estadoTrasImportNoPago('2026-07-10', '2026-07-11')).toBe('moroso');
    expect(estadoTrasImportNoPago('2026-07-10', '2026-07-10')).toBe('pendiente');
  });

  it('cache: pagado → al_dia', () => {
    expect(cacheEstadoFromPension('pagado')).toBe('al_dia');
    expect(cacheEstadoFromPension(null)).toBe('sin_dato');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/utils/pensionPeriod.test.ts
```

- [ ] **Step 3: Implement `pensionPeriod.ts`**

```ts
import type { EstudianteEstadoPension, PensionEstado } from '@/types';

export function periodoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function fechaVencimientoForPeriodo(periodo: string, dia: number): string {
  const [ys, ms] = periodo.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const safeDay = Math.min(Math.max(dia, 1), 28);
  return `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

/** hoyLima y vencimiento en YYYY-MM-DD */
export function estadoTrasImportNoPago(fechaVencimiento: string, hoyLima: string): PensionEstado {
  return hoyLima > fechaVencimiento ? 'moroso' : 'pendiente';
}

export function cacheEstadoFromPension(estado: PensionEstado | null | undefined): EstudianteEstadoPension {
  if (!estado) return 'sin_dato';
  if (estado === 'pagado') return 'al_dia';
  if (estado === 'pendiente') return 'pendiente';
  return 'moroso';
}
```

Usar fechas Lima en callers (`getLimaTodayDate()`), no `new Date()` local del browser salvo tests.

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/lib/utils/pensionPeriod.test.ts
```

- [ ] **Step 5: Commit** (si aplica)

---

### Task 3: Parser Excel + matching

**Files:**
- Create: `src/lib/utils/pensionesExcelParser.ts`
- Create: `src/lib/utils/pensionesMatch.ts`
- Create: `src/lib/utils/pensionesExcelParser.test.ts`
- Create: `src/lib/utils/pensionesMatch.test.ts`
- Optional fixture: `src/lib/utils/__fixtures__/pension-banco-min.xlsx` (generar en test con ExcelJS)

**Interfaces:**
- Consumes: `buildStudentLookupVariants` de `studentsService`; normalización tipo `normalizePersonName` (portar a `src/lib/utils/personName.ts` si solo existe en script)
- Produces: `parsePensionesExcelBuffer(buf)`, `matchPensionRows(rows, studentsIndex)`

- [ ] **Step 1: Write failing match tests**

```ts
import { matchPensionCandidate } from './pensionesMatch';

describe('matchPensionCandidate', () => {
  const students = [
    { id: 1, barcode: '01234567', fullName: 'PEREZ GOMEZ ANA' },
    { id: 2, barcode: '87654321', fullName: 'LOPEZ RUIZ JUAN' },
  ];

  it('match por DNI sin cero', () => {
    const r = matchPensionCandidate({ rawDni: '1234567', rawNombre: null }, students);
    expect(r.status).toBe('ok');
    expect(r.idEstudiante).toBe(1);
  });

  it('sin match', () => {
    const r = matchPensionCandidate({ rawDni: '999', rawNombre: 'NADIE' }, students);
    expect(r.status).toBe('sin_match');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/lib/utils/pensionesMatch.test.ts
```

- [ ] **Step 3: Implement match + parser**

- `pensionesMatch.ts`: índice Map barcode→student + Map nombreNormalizado→student[]; usar variantes DNI; si nombre choca con 2+ → `ambiguo`.
- `pensionesExcelParser.ts`: `ExcelJS.Workbook.xlsx.load(buffer)`; detectar fila header por keywords (`dni|documento|nombre|alumno|monto|fecha`); devolver `{ headers, rows: { rowIndex, rawDni, rawNombre, monto, fechaPago }[] }`.
- Portar `normalizePersonName` a `src/lib/utils/personName.ts` (copiar lógica de `scripts/promote-students-from-carnets.mjs`).

- [ ] **Step 4: Tests parser con workbook en memoria**

```ts
import ExcelJS from 'exceljs';
import { parsePensionesExcelBuffer } from './pensionesExcelParser';

it('detecta columnas DNI y Nombre', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['DNI', 'Nombre Completo', 'Monto']);
  ws.addRow(['01234567', 'PEREZ GOMEZ ANA', 350]);
  const buf = await wb.xlsx.writeBuffer();
  const parsed = await parsePensionesExcelBuffer(buf);
  expect(parsed.rows[0].rawDni).toBe('01234567');
  expect(parsed.rows[0].monto).toBe(350);
});
```

- [ ] **Step 5: Run all — PASS**

```bash
npx vitest run src/lib/utils/pensionesMatch.test.ts src/lib/utils/pensionesExcelParser.test.ts
```

- [ ] **Step 6: Commit** (si aplica)

---

### Task 4: SQL DDL + RLS + RPC

**Files:**
- Create: `scripts/PENSIONES_JP.sql`

**Interfaces:**
- Produces: tablas `pensiones_config`, `pensiones`, `pensiones_import_log`; columna `estudiantes.estado_pension`; RPCs `sie_pensiones_upsert_lote`, `sie_pensiones_listar`, `sie_pensiones_historial_anio`, `sie_pensiones_get_config`, `sie_pensiones_set_config`; trigger cache; extender `_sie_student_json` / completo con `estadoPension`

- [ ] **Step 1: Escribir SQL completo** (aplicar en JP con review humano)

Contenido mínimo:

1. `ALTER TABLE estudiantes ADD COLUMN estado_pension ...`
2. Tablas config / pensiones / import_log según spec §7
3. Trigger `pensiones_refresh_estado_estudiante` que, si `periodo = to_char(timezone('America/Lima', now()), 'YYYY-MM')`, setea `estado_pension` vía `cache` mapping
4. RLS policies (Admin/Director write; staff select; padre select hijos; tutor no escribe)
5. RPC upsert: valida rol Admin/Director; por cada fila upsert; escribe import_log **sin** bytes; recalcula cache
6. Extender JSON estudiante: `'estadoPension', e.estado_pension`

Helper rol:

```sql
CREATE OR REPLACE FUNCTION public._sie_es_admin_o_director()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.sie_sesion_rol() IN ('Admin', 'Director') AND public.sie_tiene_sesion();
$$;
```

Payload fila upsert ejemplo:

```json
{ "id_estudiante": 1, "estado": "pagado", "monto": 350, "fecha_pago": "2026-07-05", "fuente": "banco_excel" }
```

- [ ] **Step 2: Checklist manual post-apply**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'estudiantes' AND column_name = 'estado_pension';
SELECT * FROM public.pensiones_config;
```

- [ ] **Step 3: Commit script** (si aplica)

```bash
git add scripts/PENSIONES_JP.sql
git commit -m "feat(pensiones): DDL RLS y RPCs JP"
```

---

### Task 5: `pensionesService` + map student

**Files:**
- Create: `src/lib/services/pensionesService.ts`
- Modify: `src/lib/services/studentsService.ts` (`mapRpcStudent`)
- Modify: `src/lib/services/index.ts` (export)

**Interfaces:**
- Consumes: RPCs Task 4
- Produces: `pensionesService.importLote`, `.listByPeriodo`, `.historialAnio`, `.getConfig`, `.setConfig`, `.updateManual`

- [ ] **Step 1: Extender `mapRpcStudent`**

```ts
estadoPension: (raw.estadoPension as Student['estadoPension']) ?? 'sin_dato',
```

- [ ] **Step 2: Implementar servicio**

Patrón igual a otros servicios: `sessionService.getApiToken()`, `supabase.rpc(...)`.

```ts
async importLote(input: {
  periodo: string;
  modo: PensionImportModo;
  nombreArchivo: string | null;
  filas: Array<{
    id_estudiante: number;
    estado: PensionEstado;
    monto?: number | null;
    fecha_pago?: string | null;
  }>;
}): Promise<{ ok: boolean; importId?: number; error: string | null }>
```

- [ ] **Step 3: Smoke manual** con usuario Admin en dev (después de SQL)

- [ ] **Step 4: Commit** (si aplica)

---

### Task 6: UI Admin `/pensiones`

**Files:**
- Create: `src/pages/PensionesAdmin.tsx`
- Create: `src/components/pensiones/PensionImportPanel.tsx`
- Create: `src/components/pensiones/PensionYearGrid.tsx`
- Modify: `src/App.tsx`
- Modify: `src/config/staffNavigation.ts`
- Modify: `src/config/staffNavigation.test.ts`

**Interfaces:**
- Consumes: `isPensionesEnabled`, `pensionesService`, parser/match
- Produces: ruta protegida Director+Admin

- [ ] **Step 1: Nav + ruta solo si flag**

En `staffNavigation.ts`, ítem:

```ts
{
  path: '/pensiones',
  label: 'Pensiones',
  icon: /* Wallet o Banknote de lucide */,
  roles: ['Director', 'Admin'],
}
```

Filtrar con `isPensionesEnabled()` al construir la lista (o en `getStaffNavItems`).

En `App.tsx` dentro de staff layout:

```tsx
{isPensionesEnabled() && (
  <Route
    path="/pensiones"
    element={
      <ProtectedRoute requiredRole={['Director', 'Admin']}>
        <PensionesAdmin />
      </ProtectedRoute>
    }
  />
)}
```

- [ ] **Step 2: Import panel**

Flujo UI:

1. Select periodo (default mes Lima).
2. Radio modo Pagaron / No pagaron.
3. `<input type="file" accept=".xlsx,.xls" />` — onChange lee `file.arrayBuffer()`, parsea, matchea contra lista activa (`studentsService.list` o RPC ligera), muestra preview tabla.
4. Confirmar → `importLote` solo filas `ok`.
5. Limpiar state del `File` / buffer.
6. Toast resumen ok/sin_match/ambiguos.
7. **No** llamar Storage.

- [ ] **Step 3: Listado periodo + edición manual de estado**

- [ ] **Step 4: Config** — día vencimiento + toggle aviso sonoro vía `setConfig`

- [ ] **Step 5: Tests nav** — con flag mock si el proyecto ya mockea env; si no, test de helper `shouldShowPensionesNav(role, enabled)`

- [ ] **Step 6: Commit** (si aplica)

---

### Task 7: Beep en TutorScanner

**Files:**
- Create: `src/lib/utils/pensionBeep.ts`
- Create: `src/lib/utils/pensionBeep.test.ts`
- Modify: `src/pages/TutorScanner.tsx`
- Optional: `public/sounds/pension-moroso.mp3`

**Interfaces:**
- Consumes: `Student.estadoPension`, config cacheada o assume true si no cargada
- Produces: `playPensionMorosoBeep()`

- [ ] **Step 1: Beep util (Web Audio, sin dependencia de archivo)**

```ts
let lastBeepAt = 0;

export function playPensionMorosoBeep(now = Date.now()): void {
  if (now - lastBeepAt < 400) return; // anti-doble beep
  lastBeepAt = now;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    void ctx.close();
  } catch {
    /* tablet sin audio — solo UI */
  }
}

export function shouldAlertPensionMorosa(
  estado: string | undefined | null,
  avisoActivo: boolean,
): boolean {
  return avisoActivo && estado === 'moroso';
}
```

- [ ] **Step 2: Tests de `shouldAlertPensionMorosa`**

- [ ] **Step 3: En TutorScanner**, tras resolver `student` (lookup barcode y búsqueda nombre), si `shouldAlertPensionMorosa(student.estadoPension, true)` → `playPensionMorosoBeep()` + badge/toast “Pensión morosa”. **No** `return` temprano; seguir registro.

- [ ] **Step 4: Verificar manual** con estudiante `estado_pension='moroso'` en BD de prueba

- [ ] **Step 5: Commit** (si aplica)

---

### Task 8: Historial anual staff + padre

**Files:**
- Modify: `src/pages/StudentsList.tsx` o diálogo detalle — embeber `PensionYearGrid` si flag
- Modify: portal padre (p.ej. `ParentAttendanceDashboard` o nueva sección en `ParentPortal`) — solo lectura

**Interfaces:**
- Consumes: `pensionesService.historialAnio(idEstudiante, anio)`

- [ ] **Step 1: `PensionYearGrid`** — 12 celdas (Ene–Dic), color: pagado verde, pendiente ámbar, moroso rojo, sin_dato gris

- [ ] **Step 2: Staff** — en ficha estudiante, cargar año actual Lima

- [ ] **Step 3: Padre** — misma grid filtrada por hijo seleccionado; ocultar si flag off

- [ ] **Step 4: Commit** (si aplica)

---

### Task 9: Verificación final

**Files:** ninguno nuevo

- [ ] **Step 1: Tests**

```bash
npx vitest run src/config/features.test.ts src/lib/utils/pensionPeriod.test.ts src/lib/utils/pensionesMatch.test.ts src/lib/utils/pensionesExcelParser.test.ts src/lib/utils/pensionBeep.test.ts
```

- [ ] **Step 2: Checklist aceptación** (spec §15)

- [ ] Flag off → sin nav `/pensiones`
- [ ] Import Excel no crea objetos en Storage
- [ ] Moroso beep + asistencia OK
- [ ] Padre aislamiento RLS
- [ ] PDF no implementado (mensaje fase 2)

- [ ] **Step 3: Documentar en README/AGENTS** una línea opcional del flag (solo si el repo ya documenta `VITE_TALLERES_ENABLED` de forma similar)

---

## Orden de ejecución sugerido

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

Tasks 6 y 7 pueden paralelizarse tras 5.

## Notas para el implementador

- Reutilizar estilo staff (`StaffToolbar`, `StaffDataPanel`) como en otras páginas Admin.
- Si el Excel real del banco llega después, ajustar solo keywords del parser — no cambiar el modelo.
- Fase 2 PDF: nuevo entry en el mismo `PensionImportPanel` que produzca las mismas filas intermedias; mismo RPC.
