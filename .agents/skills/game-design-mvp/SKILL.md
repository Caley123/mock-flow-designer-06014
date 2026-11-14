---
name: game-design-mvp
description: >-
  Scoping de MVP de juegos: core loop, vertical slice, dificultad, playtest de
  runners y ética de monetización. Usar al definir alcance, cortar features o
  diseñar Urban Rush / endless runners.
---

# Game Design MVP

## Cuándo usar

Definir alcance de un juego, loops, dificultad, vertical slice, playtests de runners, decisiones de monetización ética.

## Principio

**Un loop divertido > muchas features mediocres.** Cortar sin piedad hasta que 3 minutos de juego se sientan claros.

## Core loop (obligatorio)

Escribe en una frase:

> El jugador hace **X**, obtiene **Y**, vuelve a **X** más rápido/difícil.

Ejemplo Urban Rush:

> Corre / cambia de carril → evita obstáculos / recoge → sobrevive más lejos → sube velocidad.

Checklist del loop:

1. Acción principal en &lt; 1 segundo (tap, swipe, salto).
2. Feedback inmediato (sonido, partículas, score).
3. Riesgo vs recompensa visible.
4. Motivo para “una partida más”.

## Vertical slice

Entregar **una** rodaja jugable completa, no el juego entero:

| Incluir | Excluir (v1) |
|---------|----------------|
| 1 personaje | 8 personajes |
| 1 bioma / set de obstáculos | Mundo abierto |
| Game over + restart | Metagame profundo |
| Score / distancia | Ranking online |
| HUD mínimo | Skins shop completa |

Pasos:

1. Listar todas las ideas.
2. Marcar solo lo que sostiene el core loop.
3. Todo lo demás → backlog post-MVP.
4. Tiempo de slice: lo mínimo para playtest con alguien externo.

## Cortar features (ruthless)

Preguntas de corte:

- ¿Si lo quito, el loop sigue entendible? → quitar.
- ¿Es skin o cambia gameplay? → skin después.
- ¿Requiere tutorial largo? → simplificar mecánica, no añadir tutorial.
- ¿Es “nice for trailer”? → no entra al MVP.

## Dificultad (runners)

1. **Tutorial implícito**: primeros 10–15 s fáciles.
2. Ramp-up suave (velocidad / densidad), no picos injustos.
3. Patterns legibles: el jugador debe poder culparse a sí mismo.
4. Evitar RNG que mate sin reacción posible (reaction window mínima).
5. “Almost died” moments &gt; muertes sorpresa.

## Playtest checklist (runners)

- [ ] ¿Se entiende el control en 10 segundos sin explicación?
- [ ] ¿La primera muerte enseña algo?
- [ ] ¿Hay al menos un “casi” emocionante por run?
- [ ] ¿Restart es inmediato (&lt; 2 s)?
- [ ] ¿Se lee bien en móvil portrait (dedos no tapan HUD)?
- [ ] ¿Alguien ajeno juega 3 runs sin que intervengas?
- [ ] Anotar: confusión, frustración, aburrimiento, “otra vez”.

## Monetización ética

- **OK**: cosmetics, personajes desbloqueables por skill/juego, ads rewarded opcionales.
- **Evitar**: pay-to-win que rompe fair play, dark patterns, ads a mitad de un run sin consentimiento.
- En MVP **gratis**: cero tienda si distrae; validar diversión primero.
- Si hay ads: solo entre runs, skippable o rewarded explícito.

## Entregable al cerrar scoping

1. Core loop en 1 frase.
2. Lista MVP (≤ 8 ítems).
3. Lista “no en v1”.
4. Criterio de éxito del playtest (ej. “3 de 5 players reinician sin que se lo pidas”).
