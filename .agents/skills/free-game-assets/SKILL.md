---
name: free-game-assets
description: >-
  Fuentes gratis/CC0 de art y audio para prototipos: Kenney, OpenGameArt,
  itch.io CC0, Godot Asset Library, FreeSound, Mixkit. Usar al buscar assets
  libres para Urban Rush, Godot o game jams (solo free).
---

# Free Game Assets (CC0 / gratis)

## Cuándo usar

Buscar arte, tiles, UI o audio **gratis** para prototipos. Preferir **CC0**. Verificar licencia antes de ship comercial.

## Preferencia de licencia

1. **CC0 / public domain** — ideal (uso comercial OK, atribución no obligatoria).
2. **CC-BY** — OK si se atribuye en credits.
3. Evitar packs “free for personal only” o con royalties.

Anotar siempre: fuente, licencia, si requiere credit.

## Fuentes recomendadas (free)

| Fuente | Qué hay | Notas |
|--------|---------|--------|
| [Kenney.nl](https://kenney.nl/assets) | Tiles, characters, UI, audio | CC0; perfecto para MVP |
| [OpenGameArt](https://opengameart.org) | 2D/3D/audio mixto | Filtrar por CC0 / CC-BY |
| [itch.io](https://itch.io/game-assets/free) | Packs free / CC0 / CC-BY | Leer “Asset license” en cada pack |
| [Godot Asset Library](https://godotengine.org/asset-library/asset) | Plugins, demos, algunos art | Compatible con versión Godot del proyecto |
| [FreeSound](https://freesound.org) | SFX / ambisonics | **License check** por sonido (CC0, CC-BY, sampling+) |
| [Mixkit](https://mixkit.co) | Music / SFX / video | Revisar licencia Mixkit Stock (gratis con condiciones) |

## Flujo de búsqueda

1. Definir necesidad exacta (ej. “tileset pixel platformer”, “whoosh SFX”, “UI buttons”).
2. Buscar primero en **Kenney** (rápido, CC0, cohesivo).
3. Si falta: OpenGameArt / itch.io con filtro free + CC0.
4. Audio: Mixkit o FreeSound; confirmar licencia **archivo por archivo**.
5. Guardar en carpeta local con `LICENSE.txt` o nota de atribución.
6. Importar a Godot (`assets/…`); ajustar Filter / mipmaps para móvil.

## Carpeta local sugerida (Urban Rush)

```
%USERPROFILE%\Games\urban-rush-assets\
  kenney-.../
  sfx/
  music/
  ATTRIBUTION.md
```

En `ATTRIBUTION.md` listar: pack, autor, URL, licencia, credit requerido (sí/no).

## Checklist antes de usar en build

- [ ] Licencia leída (no solo el título “free”)
- [ ] Uso comercial permitido si el juego lo será
- [ ] Atribución preparada si CC-BY
- [ ] No redistribuir el pack entero como propio
- [ ] Tamaño/optimización OK para Android

## Kenney — packs útiles para runners

- **Pixel Platformer** / **Abstract Platformer** — tiles, characters, items
- UI packs — botones, paneles HUD
- Audio packs — impactos, coins, UI clicks

Descargas: [kenney.nl/assets](https://kenney.nl/assets) o espejos itch/OpenGameArt (mismo contenido CC0).

## Anti-patrones

- Mezclar 5 estilos art distintos en el MVP (se ve “asset flip”).
- Usar música con licencia dudosa “de YouTube”.
- Asumir que “free download” = CC0.
- Meter assets de pago / AI marketplaces si el brief pide **solo free**.

## Mínimo viable de assets

Para un runner jugable:

1. Player + 2–3 obstáculos + 1 coin/pickup  
2. Fondo simple (parallax 1 capa OK)  
3. 3 SFX (jump/swipe, hit, score) + 1 loop de música opcional  
4. Fuente legible (Kenney font o libre similar)
