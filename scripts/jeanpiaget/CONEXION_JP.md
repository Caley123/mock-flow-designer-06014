# Conexión Jean Piaget (solo este colegio)

| Campo | Valor |
|-------|--------|
| URL | `https://kelylvvoebneugnajiwv.supabase.co` |
| Ref | `kelylvvoebneugnajiwv` |
| Uso | **Solo** Colegio Jean Piaget (`jeanpiaget.asiscole.com`) |
| VPS env | `/opt/sie-jp/.env.build` |

**No** uses esta BD para Asiscole (`spdugaykkcgpcfslcpac`).

## Cómo aplicar SQL

1. Dashboard → proyecto `kelylvvoebneugnajiwv` → **SQL Editor**
2. Orden: `ORDEN_SQL_SUPABASE.md`
3. Luego usuarios: `CREAR_USUARIOS_JP.sql`

## Para que el agente pueda subir scripts solo

Pega en el chat (una sola vez, no la subas a GitHub):

- **Settings → API → `service_role`** (secret), **o**
- **Settings → Database → URI** (connection string con password)

Con eso se pueden ejecutar los `.sql` desde aquí sin el SQL Editor.
