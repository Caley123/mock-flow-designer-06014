# Diseño: Calendario no lectivo (feriados y días sin clases)

**Fecha:** 2026-09-06  
**Colegio piloto:** Jean Piaget  
**Estado:** aprobado (BD aplicada en JP 2026-09-06)

## Objetivo

Evitar que el cierre automático de **Falta** marque inasistencias en feriados nacionales o en días sin clases definidos por el colegio, y exponer esos días en Configuración y en el calendario web de padres.

## Alcance

### Incluye

- Tabla `calendario_no_lectivo` en BD JP.
- Precarga de feriados nacionales Perú 2026.
- UI en **Administración → Configuración** para listar, agregar y quitar/desactivar.
- Actualizar `sie_jp_marcar_faltas_dia` para saltar fechas activas de esa tabla.
- Portal padres (web SIE): día = sin clases; al tocar, mostrar el nombre del feriado/día.
- Canal/API (sin tocar APK): si construye el calendario de asistencia, no inferir «Falta» en esas fechas; preferir etiqueta «Feriado» / sin clase cuando sea posible solo con backend.

### No incluye

- Cambios al APK / app nativa.
- Días no laborables regionales (Apurímac, Junín, Tacna, etc.) salvo que el colegio los agregue a mano.
- Días no laborables solo del sector público (p. ej. 27 jul 2026) en la precarga nacional.
- Re-sembrar automática anual; el botón de carga es manual por año.

## Modelo de datos

Tabla `public.calendario_no_lectivo`:

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | serial PK | |
| `fecha` | date UNIQUE | Un registro por fecha |
| `nombre` | text NOT NULL | Ej. «Combate de Angamos» |
| `tipo` | text NOT NULL | `nacional` \| `colegio` |
| `activo` | boolean NOT NULL DEFAULT true | Desactivar = no aplica |
| `origen` | text NOT NULL | `seed` \| `manual` |
| `fecha_creacion` | timestamptz DEFAULT now() | |

Índice: `(fecha) WHERE activo` para el job diario.

RLS: lectura autenticada; escritura Admin/Director (mismo criterio que otras tablas de configuración staff). Si el patrón JP usa `service_role` + front con anon limitado, alinear con `configuracion_sistema` / políticas existentes.

### Precarga nacional 2026

Insertar solo si no existe la fecha (`ON CONFLICT DO NOTHING` o equivalente):

- 2026-01-01 Año Nuevo  
- 2026-04-02 Jueves Santo  
- 2026-04-03 Viernes Santo  
- 2026-05-01 Día del Trabajo  
- 2026-06-07 Batalla de Arica y Día de la Bandera  
- 2026-06-29 San Pedro y San Pablo  
- 2026-07-23 Día de la Fuerza Aérea del Perú  
- 2026-07-28 Fiestas Patrias  
- 2026-07-29 Fiestas Patrias  
- 2026-08-06 Batalla de Junín  
- 2026-08-30 Santa Rosa de Lima  
- 2026-10-08 Combate de Angamos  
- 2026-11-01 Día de Todos los Santos  
- 2026-12-08 Inmaculada Concepción  
- 2026-12-09 Batalla de Ayacucho  
- 2026-12-25 Navidad  

Tipo `nacional`, origen `seed`. El botón «Cargar feriados nacionales 2026» solo inserta faltantes; no modifica filas `manual` ni renombra semillas ya editadas.

## Lógica de faltas

En `sie_jp_marcar_faltas_dia(p_fecha)`:

1. Si fin de semana, fecha &lt; inicio oficial, o fecha futura → return 0 (igual que hoy).
2. **Nuevo:** si existe fila activa en `calendario_no_lectivo` para `p_fecha` → return 0.
3. En caso contrario, marcar faltas como hoy.

No borrar registros `Falta` históricos si alguien agrega un feriado a posteriori (YAGNI); opcional futuro: herramienta de anulación.

## UI staff

Nueva tarjeta `HolidaysSettingsCard` en `SystemConfig`:

- Lista del año seleccionado (default: año Lima actual).
- Columnas: fecha, nombre, tipo (badge), activo.
- Acciones: agregar (fecha + nombre + tipo colegio/nacional), desactivar/activar, eliminar.
- Botón seed 2026.
- Roles: quien ya entra a `/system-config` (Admin/Director).

## Portal padres (web)

- Extender resolución de día: si `fecha` ∈ feriados activos → `noclass` (además de fin de semana / futuro).
- Detalle al tocar: título/descripción = nombre del día no lectivo (opción C).
- Servicio `holidaysService` (o equivalente) lee `calendario_no_lectivo` activos por rango de mes.

## App móvil (sin APK)

- Garantía mínima: al no crear `Falta` en feriados, la app no debería mostrar falta inventada por registro.
- Mejora canal (si el backend infiere falta sin registro): consultar `calendario_no_lectivo` y mapear a «Feriado» / sin clase **sin cambiar el APK**.
- Si el APK hardcodea texto y no lee un label del API, se acepta vacío/sin falta hasta una release de app.

## Errores y edge cases

- Fecha duplicada al agregar → error claro «Ya existe un día sin clases en esa fecha».
- Seed idempotente.
- Fin de semana + feriado: sigue siendo sin clases; no hay falta.
- Escaneo accidental en feriado: fuera de alcance de este diseño (sigue pudiendo registrarse llegada si alguien escanea).

## Pruebas

- Unit: calendario padres marca `noclass` + nombre cuando hay feriado.
- SQL/manual: `sie_jp_marcar_faltas_dia` en un feriado seed → 0 marcados.
- UI: CRUD básico + seed no duplica.

## Fuera de este diseño

San Ramón u otros tenants hasta replicar el SQL/UI si se pide.
