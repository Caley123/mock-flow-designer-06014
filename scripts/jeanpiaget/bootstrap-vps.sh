#!/usr/bin/env bash
# Primera instalación Jean Piaget en el VPS (no modifica /opt/sie de Asiscole).
# Uso (en el VPS, como root):
#   bash bootstrap-vps.sh
# o, desde tu PC (PowerShell):
#   scp -i E:\ssh-keys\hetzner-sie scripts/jeanpiaget/* root@178.104.115.2:/tmp/jp/
#   ssh -i E:\ssh-keys\hetzner-sie root@178.104.115.2 "bash /tmp/jp/bootstrap-vps.sh"
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/AndreMendezCisneros/Asiscole_JeanPiaget.git}"
BRANCH="${BRANCH:-main}"
ROOT="/opt/sie-jp"
APP_DIR="${ROOT}/app"
ENV_FILE="${ROOT}/.env.build"

echo "==> Carpetas"
mkdir -p "$ROOT" /etc/caddy/sites.d /var/log

echo "==> Clonar / actualizar repo"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "==> Copiar plantillas locales (si vienen en /tmp/jp)"
if [[ -f /tmp/jp/jeanpiaget-caddy.caddy ]]; then
  mkdir -p "${APP_DIR}/scripts/jeanpiaget"
  cp /tmp/jp/jeanpiaget-caddy.caddy "${APP_DIR}/scripts/jeanpiaget/"
  cp /tmp/jp/vps-deploy-jeanpiaget.sh "${APP_DIR}/scripts/jeanpiaget/" 2>/dev/null || true
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cat >"$ENV_FILE" <<'EOF'
# Completar con el proyecto Supabase de Jean Piaget
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_URL=https://jeanpiaget.asiscole.com
VITE_OPENWA_ENABLED=false
EOF
  chmod 600 "$ENV_FILE"
  echo ""
  echo "IMPORTANTE: edite las claves:"
  echo "  nano $ENV_FILE"
  echo "Luego ejecute:"
  echo "  FORCE=1 $ROOT/deploy.sh"
  echo ""
fi

cp "${APP_DIR}/scripts/jeanpiaget/vps-deploy-jeanpiaget.sh" "$ROOT/deploy.sh" 2>/dev/null \
  || cp /tmp/jp/vps-deploy-jeanpiaget.sh "$ROOT/deploy.sh"
sed -i 's/\r$//' "$ROOT/deploy.sh"
chmod +x "$ROOT/deploy.sh"

# Migrar Caddy a sites.d si aún es monolítico
if [[ -f /etc/caddy/Caddyfile ]] && ! grep -q 'sites.d' /etc/caddy/Caddyfile; then
  cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%s)"
  if grep -q 'asiscole.com' /etc/caddy/Caddyfile; then
    cp /etc/caddy/Caddyfile /etc/caddy/sites.d/00-asiscole.caddy
  fi
  printf '%s\n' 'import /etc/caddy/sites.d/*.caddy' >/etc/caddy/Caddyfile
  echo "==> Caddy migrado a /etc/caddy/sites.d/"
fi

# DNS recordatorio
echo ""
echo "DNS requerido:"
echo "  A  jeanpiaget.asiscole.com  ->  178.104.115.2"
echo ""
echo "Cuando .env.build esté listo:"
echo "  FORCE=1 /opt/sie-jp/deploy.sh"
echo "URL: https://jeanpiaget.asiscole.com"
