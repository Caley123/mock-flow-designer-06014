---
name: character-game-ideas
description: >-
  Diseño de personajes jugables con habilidades únicas (no solo skins) estilo
  Urban Rush: ability que cambia gameplay, silueta, UI móvil y plantilla de
  ability sheet. Usar al inventar o balancear personajes de runners.
---

# Character Game Ideas (Urban Rush)

## Cuándo usar

Diseñar personajes jugables con **abilities** distintas — no recolors/skins — para endless runners tipo Urban Rush.

## Regla de oro

**Ability = cambia cómo se juega**, no solo cómo se ve.

| Skin (después) | Ability (MVP / roster) |
|----------------|-------------------------|
| Color, outfit | Nueva regla de movimiento, riesgo o scoring |
| Mismo hitbox/feel | El jugador adapta timing/estrategia |

Si dos personajes se juegan igual con otro sprite → son skins.

## Checklist por personaje

1. **Nombre** corto y memorable.
2. **Ability** en 1 línea (verbo + efecto).
3. **Trade-off** claro (poder ↔ riesgo o score).
4. **Backstory** corto (1–2 frases, tono street/urbano OK).
5. **Silueta** legible a tamaño móvil (sin detalles finos críticos).
6. **UI**: icono de ability + feedback en pantalla al activar.

## Ability patterns (runners)

- **Defensivo**: escudo 1 hit, slow-mo breve, phase through 1 obstáculo.
- **Movimiento**: dash de carril, doble salto, slide más largo.
- **Score**: magnet de coins, multiplicador con riesgo, combo window.
- **Control del mundo**: ralentiza spawn 2 s, destruye el próximo obstáculo.

Evitar: abilities que eliminen el skill gap por completo (invencible largo).

## Silueta y UI móvil

- Contraste fuerte vs fondo de ciudad/carriles.
- Forma reconocible en ~48–64 px.
- Color accent único por personaje (HUD / trail).
- Ability button: zona safe (no notch); cooldown legible (anillo o barra).
- No depender de texto largo en medio del run.

## Plantilla — Ability Sheet

Copiar por personaje:

```markdown
## [Nombre]

- Rol: (agresivo / safe / score / trickster)
- Ability: [nombre] — [qué hace en 1 línea]
- Input: tap hold / doble tap / botón HUD / automático
- Duración / cooldown: …
- Trade-off: …
- Backstory (1–2 frases): …
- Silueta / color accent: …
- VFX / SFX al activar: …
- Feel test: ¿se nota distinto en 5 segundos de juego? Sí/No
- Balance notes: …
```

## Ejemplo (referencia, no canon)

```markdown
## Nico “Frenos”

- Rol: safe
- Ability: Frenazo — 1.2 s de slow-mo del mundo; player a velocidad normal
- Input: botón HUD
- Duración / cooldown: 1.2 s / 8 s
- Trade-off: score más lento mientras está activo
- Backstory: mensajero que aprende a “parar el tiempo” en el tráfico.
- Silueta: chaqueta ancha + casco; accent naranja
- Feel test: Sí — cambia ventanas de dodge
```

## Flujo de diseño

1. Definir 3 fantasy roles distintos (no 3 skins).
2. Rellenar ability sheet de cada uno.
3. Prototipar **solo la ability** con un cubo/capsule si aún no hay art.
4. Playtest: ¿un jugador nota la diferencia sin que se lo digas?
5. Recortar backstory/lore hasta que no retrase el ship.

## Anti-patrones

- “Fire skin” sin mecánica.
- Ability que requiere tutorial de 2 minutos.
- Roster de 10 antes de validar 1.
- Stats ocultos (+2% speed) que no se sienten.
