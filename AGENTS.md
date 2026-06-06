# SIE — guía para agentes

Este proyecto usa **Cursor Agent Skills** en `.agents/skills/`.

## Skills instaladas

| Skill | Uso |
|-------|-----|
| `sie-sistema` | Convenciones propias del SIE (leer primero) |
| `react-dev` | React + TypeScript |
| `supabase` | Cliente, auth, RLS, migraciones |
| `supabase-postgres-best-practices` | Queries e índices Postgres |
| `vite` | `vite.config.ts`, build, proxy |
| `vitest` | Tests unitarios |
| `tailwind-design-system` | Tokens, layout, componentes |
| `accessibility` | WCAG, teclado, aria-live |
| `eslint-prettier-config` | Lint y formato |
| `gsap-core`, `gsap-react`, `gsap-timeline`, etc. | Animaciones GSAP (login → portal padres) |

Listar: `npx skills list -a cursor`

Buscar más: `npx skills find <tema>`

Restaurar lockfile: `npx skills experimental_install`

## Comandos

```bash
npm run dev      # App :8080
npm run openwa   # WhatsApp :2785 / dashboard :2886
npm run test     # Vitest
npm run build
```

## Idioma UI

Interfaz y mensajes en **español** (`lang="es"`).
