# Task 9 — Escáner tutor + modo Talleres

## Estado
- Completado en `feat/talleres-jp`.

## Cambios implementados
- Se creó `src/hooks/useTallerScan.ts` para encapsular:
  - feature flag de talleres,
  - carga de talleres activos,
  - selección `Clase | Talleres`,
  - validación de taller seleccionado,
  - rechazo de estudiantes no inscritos,
  - resolución de acción `llegada | salida | completo` según el registro del día,
  - registro de llegada/salida con `tallerAttendanceService`,
  - alta de incidencias de taller con `incidentsService.create({ tallerId })`,
  - notificaciones WhatsApp de llegada, salida e incidencia con `{ tallerId, tallerNombre }`.
- Se agregó `src/hooks/useTallerScan.test.ts` para cubrir la resolución del registro del día y la decisión llegada/salida/completo.
- Se modificó `src/pages/TutorScanner.tsx` de forma quirúrgica para:
  - mostrar toggle `Clase | Talleres` y selector de taller solo cuando `isTalleresEnabled()` está activo,
  - derivar el escaneo al hook en modo Talleres sin romper el flujo actual de clase,
  - exigir taller seleccionado antes de procesar,
  - mostrar estado de salida cuando la segunda pasada registra salida de taller,
  - enrutar incidencias del escáner al flujo de taller cuando corresponde.

## Verificación
- `npm test -- src/hooks/useTallerScan.test.ts src/lib/utils/tallerArrivalStatus.test.ts src/lib/services/whatsappTallerNotify.test.ts` ✅
- `npm run build` ✅

## Notas
- No se tocó el flujo existente de clase fuera del desvío explícito cuando `scanMode === 'taller'`.
- Queda pendiente validación manual con datos reales JP para confirmar UX exacta de doble escaneo (llegada/salida) sobre alumnos inscritos.
