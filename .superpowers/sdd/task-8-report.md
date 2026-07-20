# Task 8 — Admin UI + nav + ruta

## Estado
- Completado en `feat/talleres-jp`.

## Cambios implementados
- Se creó `src/pages/TalleresAdmin.tsx` con:
  - listado de talleres,
  - creación y edición de talleres,
  - activación/desactivación,
  - gestión de inscritos usando `talleresService` y búsqueda con `studentsService.searchByName`.
- Se agregó el item `Talleres` en `src/config/staffNavigation.ts`, visible solo para `Supervisor`, `Director` y `Admin` cuando `isTalleresEnabled()` devuelve `true`.
- Se agregó la ruta protegida `/talleres` en `src/App.tsx` con carga lazy y fallback de ruta.
- Se registró el preload del chunk en `src/lib/routePreloads.ts`.
- Se añadió `src/config/staffNavigation.test.ts` para cubrir el gating del menú por feature flag.

## Verificación
- `npm test -- src/config/staffNavigation.test.ts` ✅
- `npm run build` ✅

## Notas
- La ruta `/talleres` solo existe cuando la feature flag `VITE_TALLERES_ENABLED` está activa.
- No se modificaron archivos ajenos al alcance del task.
