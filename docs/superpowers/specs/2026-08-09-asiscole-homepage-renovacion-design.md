# Spec: Homepage ASISCOLE renovada (estilo Cubicol + splash Datacole)

**Fecha:** 2026-08-09  
**Estado:** Aprobado en conversación (enfoque A)  
**Ámbito:** Solo landing comercial `marketing/` → `asiscole.com`  
**Fuera de alcance:** App SIE (JP/Academy), multi-página completa, ingeniería inversa, marca RYGJS/Nutrico, cambio de logo o paleta

---

## 1. Objetivo

Renovar la homepage de ASISCOLE para que se sienta **limpia, elegante y profesional** (inspiración Cubicol) y muestre un **splash de carga con el logo** al entrar (inspiración Datacole), sin alterar la identidad visual vigente.

## 2. Invariantes (obligatorios)

| Elemento | Regla |
|----------|--------|
| Logo | Conservar `marketing/public/favicon.svg` (y usos actuales de marca) |
| Paleta | Conservar tokens en `marketing/src/styles.css`: `--navy`, `--primary #5b21e6`, `--blue #7c3aed`, `--accent #22c7f2`, fondos `--bg` / `--bg-muted`, tipografías Outfit + Plus Jakarta Sans |
| Tema | No introducir tema crema/serif editorial ni morado genérico distinto al actual |
| Contenido de producto | Solo capacidades reales ya comunicadas (asistencia, app, pensiones, incidencias, talleres, reportes, piloto). No inventar módulos “disponibles” |
| Referencias externas | Ideas de layout/UX; no copiar assets, copy literal ni ingeniería inversa |

## 3. Ideas rescatadas (no reglas)

De **Datacole:** overlay claro + logo centrado al cargar.  
De **Cubicol:** hero con foto profesional + gradiente de marca; mucho aire; tipografía clara; sección “qué es” en 2 columnas; mockup de producto; pasos de implementación respirados.  
De la carpeta de notas (selectivo): tono profesional; hero = qué es + para quién + beneficio; CTA piloto; no vender “solo asistencia”.

## 4. Estructura de la homepage

Orden objetivo:

1. **Splash de entrada** (fuera del flujo de scroll; se retira al listo).
2. **Header** sticky: logo + nav acotada + CTA “Solicitar piloto” + “Acceso al sistema”.
3. **Hero** full-bleed foto + overlay gradiente marca; H1; 1 lead; CTA primario + secundario; **una** captura de producto (sin chips flotantes de métricas).
4. **Qué es ASISCOLE** — 2 columnas: copy + imagen (`tablet.jpg` / `classroom.jpg`).
5. **Módulos** — grid limpio (5–6 ítems reales).
6. **Cómo funciona** — 4 pasos (escaneo → app → dirección → reportes). Reutilizar el flujo actual, estilo más aireado.
7. **Producto / capturas** — 3–4 screens reales (`vista-general`, `escaner`, `llegadas`, `incidencias`).
8. **Confianza** — carnets / instituciones (San Ramón, Jean Piaget) ya existentes.
9. **Planes** — Piloto S/0 · Estándar cotizar · Premium institucional (sin inventar precios fijos nuevos).
10. **Piloto 30 días** — 3 tarjetas de cronograma (compacto).
11. **CTA contacto** + **footer**.

### Incidencias

La matriz larga con tabs se **compacta** a un bloque breve (1 título + 1 párrafo + enlace ancla a “módulos/incidencias” o 3 bullets de valor). No se elimina el mensaje de incidencias; se elimina el ruido de 10 paneles.

### Nav sugerida (misma página)

`#inicio` · `#plataforma` (qué es) · `#modulos` · `#como-funciona` · `#capturas` · `#precios` · `#piloto` · `#contacto`

## 5. Splash (Datacole)

- Markup: `#boot-splash` fixed fullscreen, z-index alto.
- Fondo: blanco / `--bg` con opacidad alta (contenido apenas visible o tapado).
- Centro: logo ASISCOLE (`favicon.svg` o PNG 192) + texto opcional “ASISCOLE” con tipografía display.
- Timing: ~1.0–1.5 s mínimo o hasta `window.load` / fonts ready (el que ocurra después, con tope ~2.5 s).
- Salida: fade + `pointer-events: none`; quitar del DOM o `aria-hidden` + `hidden`.
- `prefers-reduced-motion: reduce`: mostrar ≤200 ms o saltar.
- Accesibilidad: `role="status"` / `aria-live="polite"`, `aria-busy` en `document.documentElement` mientras dure.

## 6. Hero (Cubicol)

- Foto full-bleed (`students.jpg` o `hero-school.jpg`); overlay con gradiente navy/primary (tokens actuales), no card inset.
- Brand visible (logo o wordmark ASISCOLE) a nivel hero, no solo en nav.
- Un H1; un lead; CTA primario accent; CTA secundario outline hacia `#capturas` o `#modulos`.
- Producto: `hero-screen` con captura; **quitar** `hero-float` A/B/C.

## 7. Motion

- Splash: fade out.
- Hero: entrada suave GSAP existente, adaptada (sin floats).
- Secciones: `data-reveal` scroll existente.
- Respetar reduced-motion en todo.

## 8. Archivos a tocar

| Archivo | Cambio |
|---------|--------|
| `marketing/index.html` | Reordenar secciones; splash; compactar incidencias; limpiar hero |
| `marketing/src/styles.css` | Estilos splash, hero limpio, spacing/aire; no retocar tokens de color base |
| `marketing/src/main.js` | Lógica splash; quitar animaciones de floats |

Sin nuevas dependencias npm salvo las ya usadas (GSAP).

## 9. Criterios de éxito

- [ ] Al abrir la home, lo primero es el logo cargando (splash).
- [ ] Primera pantalla se lee como una composición (no dashboard de marketing).
- [ ] Logo y colores de marca sin cambios perceptibles de identidad.
- [ ] Sin chips/stats flotantes sobre el hero.
- [ ] Matriz de tabs de incidencias no aparece en su forma larga.
- [ ] Mobile: nav usable, splash centrado, hero legible.
- [ ] `prefers-reduced-motion` no deja splash colgado.

## 10. Fuera de alcance (esta entrega)

- Páginas `/plataforma`, `/modulos/[slug]`, etc.
- Redesign del design system completo del app React.
- Deploy VPS (puede ser paso aparte tras OK visual).
- Fotos stock nuevas de pago (usar assets ya en `marketing/public/photos`).

## 11. Aprobaciones

- Enfoque **A** aprobado por el usuario (2026-08-09).
- Matriz de incidencias: **compactar** (default del diseño A).
