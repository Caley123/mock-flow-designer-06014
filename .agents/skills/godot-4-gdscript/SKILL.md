---
name: godot-4-gdscript
description: >-
  Godot 4.3+/4.4 con GDScript: escenas, señales, estructura de proyecto, endless
  runners y export Android portrait. Usar en proyectos Godot, GDScript, scenes,
  mobile export o Urban Rush / runners.
---

# Godot 4 + GDScript

## Cuándo usar

Proyectos Godot **4.3+ / 4.4**, GDScript, escenas, endless runners, export Android.

## Preferencia

- Preferir **GDScript** (rápido de iterar, gratis, nativo en el editor).
- C# solo si el equipo ya lo exige; no mezclar sin motivo.

## Estructura de proyecto sugerida

```
res://
  scenes/          # .tscn por pantalla/entidad
  scripts/         # .gd (o junto a la escena si es 1:1)
  assets/          # art, audio, fonts
  ui/              # HUD, menús
  autoload/        # singletons (GameState, Audio, Score)
  export/          # presets / notas de build (opcional)
```

1. Un **autoload** `GameState` para score, distancia, personaje activo.
2. Escena principal `Main.tscn` → spawner de obstáculos + player + HUD.
3. Separar **lógica de run** (velocidad, spawn) de **UI**.

## Scenes vs scripts

| Usar escena (.tscn) | Usar script (.gd) |
|---------------------|-------------------|
| Jerarquía de nodos, colisiones, UI | Comportamiento, state machines |
| Instanciar prefabs (obstáculo, coin) | Señales, timers, scoring |

- 1 entidad jugable = 1 escena raíz + script en la raíz.
- No meter toda la lógica en `Main.gd`: extraer `Player`, `ObstacleSpawner`, `Hud`.

## Señales (signals)

1. Declarar: `signal died` / `signal scored(points: int)`.
2. Conectar en el editor **o** en código: `player.died.connect(_on_player_died)`.
3. Evitar referencias circulares hardcodeadas; preferir señales hacia arriba.
4. Para UI: el jugador emite; el HUD escucha (no al revés).

## Endless runner — checklist mínimo

- [ ] Velocidad base + ramp-up por distancia/tiempo
- [ ] Spawner con pools o `queue_free` al salir de pantalla
- [ ] Colisión player ↔ obstáculo → game over
- [ ] Input táctil + teclado (probar ambos)
- [ ] Portrait: cámara/viewport 9:16 o 720×1280 lógico

## Export Android (portrait) — checklist

1. **Project → Project Settings → Display → Window**: viewport portrait; stretch mode `canvas_items`, aspect `keep_width` o `expand`.
2. **Export → Android**: package name único; min SDK razonable; permisos solo los necesarios.
3. Iconos / adaptive icon; orientación **Portrait** en el preset.
4. Probar en dispositivo real (gestos, notch, back button).
5. Debug: USB debugging; release: keystore (no subir keystore al repo).

## Pitfalls comunes

- Olvidar `class_name` / tipado → errores tarde en runtime.
- Mover nodos en `_ready` antes de que el árbol esté listo.
- `get_node("../...")` frágil; preferir `@onready` + exports o señales.
- Física en `_process` en lugar de `_physics_process`.
- Assets enormes sin import settings (Filter, Compression) → lag en móvil.
- Probar solo en editor desktop: el input táctil se comporta distinto.

## Assets gratis

- [Godot Asset Library](https://godotengine.org/asset-library/asset) — plugins y demos oficiales/comunidad.
- [Kenney.nl](https://kenney.nl/assets) — packs CC0 (plataformas, UI, audio). Ideal para prototipos Urban Rush.

## Flujo rápido

1. Crear escena Player + CollisionShape2D + AnimatedSprite2D/Sprite2D.
2. Main con spawner + suelo/carriles.
3. Señales `scored` / `died` → GameState + HUD.
4. Ajustar dificultad (spawn rate, speed).
5. Export Android portrait y playtest en móvil.
