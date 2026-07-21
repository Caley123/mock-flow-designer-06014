# Instalar Colegio Jean Piaget en el mismo VPS

**No sustituye Asiscole.** Quedan dos sitios:

| Colegio | URL | App | Dist | Env |
|---------|-----|-----|------|-----|
| Asiscole | https://asiscole.com | `/opt/sie/app` | `/opt/sie/dist` | `/opt/sie/.env.build` |
| Jean Piaget | https://jeanpiaget.asiscole.com | `/opt/sie-jp/app` | `/opt/sie-jp/dist` | `/opt/sie-jp/.env.build` |

Repo: https://github.com/AndreMendezCisneros/Asiscole_JeanPiaget.git

---

## A) Antes (tu PC / DNS / Supabase)

1. **DNS** (panel asiscole.com):

   ```
   A   jeanpiaget.asiscole.com   178.104.115.2
   ```

2. **Crear proyecto Supabase** nuevo (nombre: `sie-jean-piaget` o similar).
   - Anota: Project URL + `anon` public key.
   - SQL Editor → ejecutar scripts en el orden de `ORDEN_SQL_SUPABASE.md`.

3. (Opcional) Sube estos archivos al VPS desde este repo Asiscole:

```powershell
scp -i E:\ssh-keys\hetzner-sie -r `
  e:\mock-flow-designer-06014\scripts\jeanpiaget `
  root@178.104.115.2:/tmp/jp
```

---

## B) En el VPS (primera vez)

```bash
ssh -i E:\ssh-keys\hetzner-sie root@178.104.115.2

bash /tmp/jp/bootstrap-vps.sh
# o, si ya están en el repo JP:
#   cd /opt/sie-jp/app && bash scripts/jeanpiaget/bootstrap-vps.sh
```

Editar claves:

```bash
nano /opt/sie-jp/.env.build
```

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_APP_URL=https://jeanpiaget.asiscole.com
VITE_OPENWA_ENABLED=false
```

Primer build + Caddy:

```bash
FORCE=1 /opt/sie-jp/deploy.sh
```

Comprobar:

```bash
curl -I https://jeanpiaget.asiscole.com
ls /etc/caddy/sites.d/
# debe existir 00-asiscole.caddy y 10-jeanpiaget.caddy
```

Asiscole debe seguir OK: `https://asiscole.com`

---

## C) Deploys siguientes

```bash
cd /opt/sie-jp/app && git pull
FORCE=1 /opt/sie-jp/deploy.sh
```

Cron opcional (solo JP):

```bash
crontab -e
# */5 * * * * /opt/sie-jp/deploy.sh >> /var/log/sie-jp-deploy.log 2>&1
```

---

## D) WhatsApp (después)

Dejar `VITE_OPENWA_ENABLED=false` hasta tener chip/sesión **propia** de Jean Piaget.
No reutilices los chips de Asiscole en el mismo portal.

---

## E) Si algo falla

| Síntoma | Qué revisar |
|---------|-------------|
| Certificado / DNS | `dig jeanpiaget.asiscole.com` → IP del VPS |
| Pantalla en blanco / API blocked | CSP: host Supabase correcto en `10-jeanpiaget.caddy` |
| Login no funciona | SQL RLS/login y tablas en el proyecto JP |
| Asiscole dejó de servir | Restaurar backup `/etc/caddy/Caddyfile.bak.*` o `sites.d/00-asiscole.caddy` |

---

## Inventario en el VPS tras instalar

```
/opt/sie/                 # Asiscole (intacto)
/opt/sie-jp/
  app/                    # git clone Jean Piaget
  dist/                   # frontend build
  .env.build              # claves Supabase JP
  deploy.sh
/etc/caddy/Caddyfile      # import sites.d/*.caddy
/etc/caddy/sites.d/
  00-asiscole.caddy
  10-jeanpiaget.caddy
```
