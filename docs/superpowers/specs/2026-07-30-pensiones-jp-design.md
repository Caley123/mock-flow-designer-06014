# Spec: Módulo Pensiones (Jean Piaget)

**Fecha:** 2026-07-30  
**Estado:** diseño confirmado (decisiones de producto cerradas)  
**Colegio:** solo Jean Piaget (`jeanpiaget.asiscole.com` / `/opt/sie-jp`) en la primera entrega  
**Plan:** `docs/superpowers/plans/2026-07-30-pensiones-jp.md`  
**Fuera de este doc:** rotación de ingest key / rate limit (trabajo aparte)

## 1. Problema

Hoy no existe seguimiento de pensiones en SIE. El colegio recibe del banco listados (Excel y, a futuro, PDF) de quién pagó o no ese mes. Necesitan:

1. Estado de pensión por estudiante (al día / pendiente / moroso).
2. Tabla de vencimientos y pagos por periodo mensual.
3. Aviso sonoro en el escáner tutor cuando el alumno no pagó / está moroso.
4. Importación admin de Excel (y PDF en fase 2) **sin persistir el archivo**.
5. Historial anual por estudiante (staff y padre de su hijo).
6. Notificación WhatsApp a padres que no pagaron (mismo patrón que llegadas).

## 2. Contexto del codebase (hallazgos)

| Pieza | Estado actual |
|-------|----------------|
| `estudiantes` | PK `id_estudiante` **integer**; identidad vía `codigo_barras` (DNI/carnet); sin campo pensión |
| Roles | `Admin`, `Director`, `Supervisor`, `Tutor`, `Padre` — sesión custom `x-sie-token` + `sie_sesion_rol()` |
| TutorScanner | Lookup `studentsService.lookupByBarcodeOrDni`; registro llegada/salida/taller; **sin Audio/beep hoy** |
| Excel | `ExcelJS` ya en deps (`excelExport`, scripts `sync-nomina-2026.mjs`); matching nombres en `promote-students-from-carnets.mjs` (`normalizePersonName`) |
| Storage | Fotos de perfil sí van a Storage; **pensiones no deben usar Storage** |
| Patrón módulo JP | Talleres: flag `VITE_TALLERES_ENABLED`, SQL en `scripts/TALLERES_JP.sql`, servicios en `src/lib/services/` |
| WhatsApp | `whatsappService` + mobile ingest (`VITE_MOBILE_INGEST_*`) |

## 3. Enfoques evaluados

| # | Enfoque | Pros | Contras |
|---|---------|------|---------|
| **A (recomendado)** | Una tabla `pensiones` (1 fila por alumno+periodo) + config + log de import (solo metadatos) + columna cache `estudiantes.estado_pension` | Simple, upsert natural, lectura rápida en escáner | Cache a mantener con trigger |
| B | `pensiones_periodos` + `pensiones_pagos` normalizado | Más “contable” | Overkill para v1 mensual; más joins |
| C | Edge Function recibe archivo y parsea en servidor | Centraliza parser | Más infra; riesgo de logs/tmp; el requisito es descartar blob — el cliente ya puede parsear en memoria |

**Decisión:** enfoque **A**. Parser Excel en el **navegador** (ArrayBuffer → ExcelJS → filas) → RPC/batch a Postgres → liberar el `File`/`ArrayBuffer`. Nunca `supabase.storage.upload` ni guardar en disco del VPS.

## 4. Decisiones confirmadas (usuario)

| Tema | Decisión |
|------|----------|
| Alcance deploy | Solo JP; flag `VITE_PENSIONES_ENABLED` (default **true** en docs/env JP) |
| Periodo | `YYYY-MM` (mes calendario Lima) |
| Excel de ejemplo del banco | **No hay** → parser **flexible por heurística** (DNI/código/barcode, nombre, monto, fecha) + **preview obligatorio** antes de confirmar |
| Día de vencimiento | **Configurable** por Admin en **Ajustes / SystemConfig** (y `pensiones_config`); **no** hardcode día 10 (default inicial 10) |
| Monto mensual | Lo configura el **colegio** en ajustes; **no** obligatorio en cada fila del Excel si no viene |
| Estados textuales | `pagado` \| `pendiente` \| `moroso` |
| Campo `pagado` | Entero claro: **1 = pagado**, **0 = sin pagar** (además del estado textual) |
| Mora | Si llega el **día siguiente al vencimiento** y sigue `pagado=0` / sin registro de pago → tratar como **moroso** (`marcar_pensiones_morosas()` al import, al abrir módulo y vía función SQL) |
| Pitido en TutorScanner | Solo **aviso** (“estudiante no pagó”); **NO bloquea** asistencia ni talleres |
| Cuándo pita | Al escanear con `pagado=0` / estado **moroso** (cache `estado_pension = moroso`) |
| Matching import | 1) `codigo_barras`/DNI (variantes), 2) nombre normalizado exacto, 3) fuzzy opcional (umbral alto) |
| Upsert | Unique `(id_estudiante, periodo)` |
| Lista “pagaron” | Marca esas filas `pagado=1`, `estado=pagado` |
| Lista “no pagaron” | Marca `pagado=0`; `moroso` si ya pasó vencimiento, si no `pendiente` |
| Resto de alumnos no en el Excel | **No** se tocan automáticamente |
| Notificación padres | WhatsApp / mobile ingest vía `whatsappService` (mismo patrón que llegadas); mensaje en español pidiendo pagar la pensión del periodo |
| PDF | **Fase 2** (UI: stub “próximamente”) |
| Quién importa | `Admin` + `Director` |
| Tutor | Solo lee `estado_pension` (SELECT) para beep |
| Padre | SELECT historial solo de hijos vinculados |
| Archivo | No Storage, no disco, no blob en BD |

### Regla de estado vs fecha

Con `fecha_vencimiento` = día `dia_vencimiento` del periodo (Lima):

- Import “pagó” → siempre `pagado=1`, `estado=pagado` (ignora vencimiento).
- Import “no pagó” → `pagado=0`; si `hoy_lima > fecha_vencimiento` → `moroso`; si no → `pendiente`.
- Recálculo: función SQL `marcar_pensiones_morosas()` (y wrappers): filas con `pagado=0` y `hoy_lima > fecha_vencimiento` → `estado=moroso`. Se invoca al importar, al listar/abrir el módulo y puede llamarse manualmente.

### `estado_pension` en estudiante (cache)

Columna `estudiantes.estado_pension text` con valores:

- `al_dia` — periodo actual `pagado=1` / `estado=pagado`, o sin deuda relevante
- `pendiente` — periodo actual `pendiente`
- `moroso` — periodo actual `moroso` (o `pagado=0` tras día siguiente al vencimiento)
- `sin_dato` — sin fila de pensión para el periodo actual (default)

Trigger `AFTER INSERT OR UPDATE OR DELETE ON pensiones` actualiza el cache del alumno para el **periodo actual** (mes Lima). El RPC `_sie_student_json*` incluye `estadoPension` para que TutorScanner no haga query extra.

## 5. Objetivos

1. Admin/Director importan Excel de pagados o no pagados de un mes y ven resumen (ok / no match / ambiguos).
2. Filas quedan en `pensiones`; el archivo se descarta de memoria.
3. Tutor al escanear oye un pitido y ve badge si el alumno no pagó / está moroso; la asistencia sigue.
4. Staff ve historial anual en ficha/panel; padre ve el de su hijo.
5. Padres sin pago pueden recibir WhatsApp pidiendo la pensión del periodo.
6. San Ramón no activa el módulo (`VITE_PENSIONES_ENABLED` ausente/false).

## 6. Fuera de alcance (v1)

- Persistencia de Excel/PDF en Storage o disco.
- OCR/PDF bancario (fase 2).
- Pasarela de pago / generación de boletas.
- Auto-marcar como morosos a todos los no listados en el Excel de “pagaron”.
- Contabilidad multi-moneda, descuentos, becas (salvo marcar manual `pagado`/`pendiente`).
- Activar en San Ramón.
- Bloquear entrada física por mora.
- Rotación ingest key / rate limit (doc de auditoría aparte).

## 7. Modelo de datos

### 7.1 `pensiones_config` (1 fila JP)

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | smallint PK default 1 | Singleton |
| `dia_vencimiento` | smallint not null default 10 | 1–28; editable en SystemConfig |
| `monto_mensual` | numeric(12,2) null | Monto por defecto del colegio |
| `moneda` | text not null default `'PEN'` | |
| `aviso_sonoro_activo` | boolean not null default true | Permite silenciar beep sin redeploy |
| `activo` | boolean not null default true | Flag de negocio (módulo aplicable) |
| `updated_at` | timestamptz | |
| `updated_by` | integer null → `usuarios` | |

### 7.2 `pensiones`

Una fila = un estudiante en un mes.

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | bigserial PK | Alineado a llegadas |
| `id_estudiante` | integer not null FK → `estudiantes` | |
| `periodo` | text not null | `YYYY-MM`, check regex |
| `fecha_vencimiento` | date not null | Calculada al crear (día config del mes) |
| `pagado` | smallint not null default 0 | **1 = pagado**, **0 = sin pagar** |
| `estado` | text not null | `pagado` \| `pendiente` \| `moroso` |
| `monto` | numeric(12,2) null | Opcional (Excel o monto_mensual config) |
| `fecha_pago` | date null | Si el Excel trae fecha |
| `fuente` | text not null | `banco_excel` \| `banco_pdf` \| `manual` |
| `notas` | text null | Motivo match / observación admin |
| `registrado_en` | timestamptz not null default now() | |
| `registrado_por` | integer null → `usuarios` | |
| `actualizado_en` | timestamptz not null default now() | |
| Unique | `(id_estudiante, periodo)` | Upsert |

Índices: `(periodo, estado)`, `(periodo, pagado)`, `(id_estudiante, periodo)`.

### 7.3 `pensiones_import_log` (metadatos, sin archivo)

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | bigserial PK | |
| `periodo` | text not null | |
| `modo` | text not null | `pagaron` \| `no_pagaron` |
| `nombre_archivo` | text null | Solo el **nombre**, no el contenido |
| `filas_leidas` | int | |
| `filas_ok` | int | |
| `filas_sin_match` | int | |
| `filas_ambiguas` | int | |
| `fuente` | text | `banco_excel` (v1) |
| `importado_por` | integer | |
| `importado_en` | timestamptz | |
| `detalle_json` | jsonb null | Resumen de errores (muestra corta) |

**Prohibido:** columnas `bytea`, `storage_path`, URL de archivo.

### 7.4 Alter `estudiantes`

```sql
ALTER TABLE public.estudiantes
  ADD COLUMN IF NOT EXISTS estado_pension text NOT NULL DEFAULT 'sin_dato'
  CHECK (estado_pension IN ('al_dia', 'pendiente', 'moroso', 'sin_dato'));
```

### 7.5 RLS (patrón SIE / talleres)

- `pensiones`, `pensiones_config`, `pensiones_import_log`: ENABLE RLS.
- Staff (`sie_es_staff_sesion()`): SELECT en las tres; INSERT/UPDATE `pensiones` y config solo si rol `Admin` o `Director`.
- Tutor: lee `estudiantes.estado_pension` vía RPC de lookup (no escribe pensiones).
- Padre: SELECT `pensiones` WHERE `sie_padre_puede_ver_estudiante(id_estudiante)`.
- Import: RPC `sie_pensiones_upsert_lote(...)` con check Admin/Director. El cliente **no** sube el Excel a Storage; solo JSON de filas ya parseadas.

GRANT a `anon`/`authenticated` como en talleres, siempre con RLS + token de sesión.

## 8. Flujo de importación (Admin / Director)

```text
[UI /pensiones] → elegir periodo + modo (Pagaron | No pagaron)
       → File input .xlsx/.xls
       → FileReader ArrayBuffer (memoria)
       → pensionesExcelParser (detectar hoja/header/columnas)
       → preview: matched / sin match / ambiguos
       → confirmar → sie_pensiones_upsert_lote(...)
       → opcional: notificar WhatsApp a no pagados
       → actualizar UI + log metadatos
       → deref ArrayBuffer / reset input (GC)
```

### 8.1 Parser flexible (Excel)

Heurística de columnas (case-insensitive, sin acentos):

| Semántica | Headers candidatos |
|-----------|-------------------|
| Identificador | `dni`, `documento`, `codigo`, `código`, `carnet`, `codigo_barras`, `nro documento` |
| Nombre | `nombre`, `apellidos`, `alumno`, `estudiante`, `nombre completo` |
| Monto | `monto`, `importe`, `monto pagado`, `soles` |
| Fecha | `fecha`, `fecha pago`, `fecha de pago` |

Pasos:

1. Primera fila con ≥2 headers reconocidos = cabecera (saltar títulos del banco).
2. Por fila: extraer id/nombre/monto/fecha.
3. Match: `buildStudentLookupVariants(dni)` contra `codigo_barras`; si falla, `normalizePersonName` exacto; si falla, candidatos fuzzy (umbral alto) solo si score ≥ umbral y único — si varios → `ambiguo`.
4. Preview obligatorio antes de escribir BD.
5. Tras éxito: no retener `File` en estado React.

### 8.2 PDF (fase 2)

- v1: botón deshabilitado o mensaje “Próximamente”.
- Fase 2 candidata: `pdf.js` extracción de texto si el PDF es digital; OCR solo si hace falta. Mismo pipeline post-filas → upsert. **Nunca Storage.**

## 9. TutorScanner — alerta sonora

**Dónde:** inmediatamente después de resolver el estudiante en el flujo de escaneo (llegada, salida y modo talleres), antes o en paralelo al registro de asistencia.

**Qué:**

1. Si `shouldAlertPensionMorosa(student.estadoPension, aviso_sonoro_activo)` (moroso / no pagó):
   - Reproducir beep corto (Web Audio).
   - Badge/toast visual: “Pensión: no pagó” (no bloqueante).
2. Continuar flujo normal de llegada/salida/taller.
3. Ofrecer mute vía `pensiones_config.aviso_sonoro_activo`.

**No** usar el beep para otros errores (estudiante no encontrado, etc.).

Extender `mapRpcStudent` / `_sie_student_json*` con `estadoPension`.

## 10. UI

### 10.1 Staff — `/pensiones` (Director + Admin)

- Nav bajo Administración o ítem propio si flag on.
- Tabs/secciones: Importar mes | Listado del periodo | historial import.
- Import: dropzone, preview, confirmar, historial de `pensiones_import_log`.
- Listado: filtros por estado, buscar alumno, edición manual de una fila.
- PDF: stub “próximamente”.

### 10.2 SystemConfig (Admin)

- Card **Pensiones**: día de vencimiento, monto mensual, aviso sonoro activo, flag aplicable.

### 10.3 Ficha / historial anual

- En detalle de estudiante: grid 12 meses con color por estado.
- Padre: sección “Pensiones” en portal (solo hijos) — lectura.

### 10.4 Feature flag

```ts
export function isPensionesEnabled(): boolean {
  return import.meta.env.VITE_PENSIONES_ENABLED === 'true';
}
```

Default documentado para JP: `VITE_PENSIONES_ENABLED=true`.

## 11. Servicios y tipos (frontend)

| Unidad | Responsabilidad |
|--------|-----------------|
| `src/lib/utils/pensionesExcelParser.ts` | ArrayBuffer → filas tipadas + detección columnas |
| `src/lib/utils/pensionesMatch.ts` | Match DNI/nombre |
| `src/lib/utils/pensionPeriod.ts` | Periodo actual, vencimiento, transición estado / mora |
| `src/lib/utils/pensionBeep.ts` | Reproducir aviso (testable con mock) |
| `src/lib/services/pensionesService.ts` | upsert lote, listar periodo, historial año, config, marcar mora |
| `whatsappService.notifyParentPensionPending` | Aviso WhatsApp pensión |
| Tipos | `PensionEstado`, `PensionRow`, `PensionImportModo`, `PensionImportPreview` |

Patrón: páginas no llaman Supabase directo; solo servicios + RPC con `sessionService` token.

## 12. Seguridad

1. **No Storage** para Excel/PDF de pensiones.
2. **No** columna binaria en Postgres.
3. RLS + check de rol en RPC de import.
4. Log solo metadatos + conteos (+ muestra corta de fallos).
5. Padre: aislamiento por `sie_padre_puede_ver_estudiante`.
6. Tutor: no puede importar ni editar pensiones.
7. Tamaño máximo archivo en cliente (p.ej. 5–8 MB) para evitar DoS de memoria en tablet.

## 13. Testing

- Unit: parser con fixtures Excel mínimas (headers variados).
- Unit: match DNI con ceros a la izquierda; nombre normalizado.
- Unit: transición pendiente→moroso según fecha Lima (día siguiente al vencimiento).
- Unit: beep no se llama si `al_dia` / `sin_dato` / config mute.
- Integración SQL (manual/script): RLS padre no ve otros hijos.

## 14. Criterios de aceptación (v1)

- [ ] Admin/Director importa Excel de pagados para un `YYYY-MM` y las filas quedan `pagado=1` / `estado=pagado`.
- [ ] Admin/Director importa Excel de no pagados y las filas quedan `pendiente` o `moroso` según vencimiento (`pagado=0`).
- [ ] El archivo no aparece en Supabase Storage ni en disco del servidor.
- [ ] Tutor escanea alumno moroso / no pagó → pitido + indicador; la llegada se registra igual.
- [ ] Tutor escanea alumno al día → sin pitido de mora.
- [ ] Historial de 12 meses visible en staff; padre solo ve a su hijo.
- [ ] Con `VITE_PENSIONES_ENABLED` false/ausente, no hay nav ni ruta activa.
- [ ] Día vencimiento y monto se editan en SystemConfig.
- [ ] WhatsApp a padres no pagados (manual o tras import no_pagaron).
- [ ] RLS: Padre A no lee pensiones de hijo de Padre B.
- [ ] PDF no implementado (mensaje “próximamente”).

## 15. Fases

| Fase | Entrega |
|------|---------|
| **1** | DDL + RLS + RPC upsert; parser Excel; UI import + listado; cache `estado_pension`; beep TutorScanner; historial anual staff+padre; config SystemConfig; WhatsApp mora |
| **2** | PDF (texto/OCR acotado); export reporte Excel de mora |
| **3** (opcional) | Becas/exonerados |

---

**Self-review:** decisiones de producto cerradas; parser heurístico sin Excel de ejemplo; vencimiento/monto en ajustes; pitido no bloqueante; `pagado` 0/1 + mora al día siguiente; WhatsApp en v1; seguridad de no-persistencia del blob cerrada; alcance JP vía flag.
