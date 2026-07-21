#!/usr/bin/env bash
set -euo pipefail
HOST=$(grep -E '^VITE_SUPABASE_URL=' /opt/sie-jp/.env.build | head -1 | sed 's/^VITE_SUPABASE_URL=https:\/\///;s/\/.*//;s/\r//')
echo "HOST=$HOST"
sed "s/__SUPABASE_HOST__/${HOST}/g" /opt/sie-jp/app/scripts/jeanpiaget/jeanpiaget-caddy.caddy > /etc/caddy/sites.d/10-jeanpiaget.caddy
sed -i 's/\r$//' /etc/caddy/sites.d/10-jeanpiaget.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
echo CADDY_OK

# Corregir $ en tokens (bcrypt) para que source no rompa
python3 - <<'PY'
from pathlib import Path
p = Path("/opt/sie-jp/.env.build")
lines = []
for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
    if line.startswith("VITE_WPPCONNECT_TOKEN=") and not (
        line.startswith("VITE_WPPCONNECT_TOKEN='") or line.startswith('VITE_WPPCONNECT_TOKEN="')
    ):
        val = line.split("=", 1)[1]
        lines.append(f"VITE_WPPCONNECT_TOKEN='{val}'")
    else:
        lines.append(line)
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("quoted WPPCONNECT_TOKEN")
PY

set +u
set -a
# shellcheck disable=SC1090
source /opt/sie-jp/.env.build
set +a
set -u

cd /opt/sie-jp/app
npm run build
rsync -a --delete dist/ /opt/sie-jp/dist/
echo BUILD_OK
grep -E 'WPPCONNECT|META' /opt/sie-jp/.env.build || true
systemctl is-active sie-jp-wpp-notify-queue
curl -s http://127.0.0.1:3102/status || true
echo
bash /opt/sie-jp/app/scripts/jeanpiaget/mostrar-qr-chip-jp.sh jp-chip-01
echo DONE
