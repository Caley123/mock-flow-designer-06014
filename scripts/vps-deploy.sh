#!/usr/bin/env bash
# Despliegue en asiscole.com (VPS Hetzner).
# Uso: cron cada 3 min o manual: /opt/sie/deploy.sh
set -euo pipefail

APP_DIR="/opt/sie/app"
DIST_DIR="/opt/sie/dist"
ENV_FILE="/opt/sie/.env.build"
LOG="/var/log/sie-deploy.log"
BRANCH="main"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

if [[ ! -d "$APP_DIR/.git" ]]; then
  log "ERROR: no existe repo en $APP_DIR"
  exit 1
fi

cd "$APP_DIR"
git fetch origin "$BRANCH" --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [[ "$LOCAL" == "$REMOTE" ]]; then
  exit 0
fi

log "Actualizando $LOCAL -> $REMOTE"
git reset --hard "origin/$BRANCH"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  log "WARN: falta $ENV_FILE; build con defaults de Vite"
fi

npm ci --no-audit --no-fund
export VITE_BUILD_ID="$(git rev-parse --short HEAD)"
npm run build

mkdir -p "$DIST_DIR"
rsync -a --delete "${APP_DIR}/dist/" "$DIST_DIR/"

if [[ -f "${APP_DIR}/scripts/vps-deploy.sh" ]]; then
  cp "${APP_DIR}/scripts/vps-deploy.sh" /opt/sie/deploy.sh
  sed -i 's/\r$//' /opt/sie/deploy.sh
  chmod +x /opt/sie/deploy.sh
fi

# Caddy: app San Ramón en sanramon.asiscole.com (no pisa la landing de asiscole.com).
CADDY_FILE="/etc/caddy/Caddyfile"
CADDY_SITES="/etc/caddy/sites.d"
CADDY_SANRAMON_SRC="${APP_DIR}/scripts/sanramon-caddy.caddy"
CADDY_MARKETING_SRC="${APP_DIR}/scripts/asiscole-marketing-caddy.caddy"
CSP_MEDIA="media-src 'self' blob: data:"
CADDY_RELOAD=0
mkdir -p "$CADDY_SITES"

if [[ ! -f "$CADDY_FILE" ]] || ! grep -q 'sites.d' "$CADDY_FILE" 2>/dev/null; then
  if [[ -f "$CADDY_FILE" ]]; then
    cp "$CADDY_FILE" "${CADDY_FILE}.bak.$(date +%s)"
  fi
  printf '%s\n' 'import /etc/caddy/sites.d/*.caddy' >"$CADDY_FILE"
  CADDY_RELOAD=1
  log "Caddyfile raíz migrado a import sites.d"
fi

# Landing asiscole.com (solo si ya existe dist marketing o el snippet)
if [[ -f "$CADDY_MARKETING_SRC" && -d /opt/asiscole-web/dist ]]; then
  DEST_WEB="${CADDY_SITES}/00-asiscole.caddy"
  if [[ ! -f "$DEST_WEB" ]] || ! cmp -s "$CADDY_MARKETING_SRC" "$DEST_WEB"; then
    cp "$CADDY_MARKETING_SRC" "$DEST_WEB"
    sed -i 's/\r$//' "$DEST_WEB"
    CADDY_RELOAD=1
    log "Caddy marketing -> sites.d/00-asiscole.caddy"
  fi
fi

if [[ -f "$CADDY_SANRAMON_SRC" ]]; then
  DEST_SR="${CADDY_SITES}/01-sanramon.caddy"
  if [[ ! -f "$DEST_SR" ]] || ! cmp -s "$CADDY_SANRAMON_SRC" "$DEST_SR"; then
    cp "$CADDY_SANRAMON_SRC" "$DEST_SR"
    sed -i 's/\r$//' "$DEST_SR"
    CADDY_RELOAD=1
    log "Caddy San Ramón -> sites.d/01-sanramon.caddy"
  fi
fi

# Parches CSP solo sobre San Ramón
if [[ -f "${CADDY_SITES}/01-sanramon.caddy" ]]; then
  SR_SITE="${CADDY_SITES}/01-sanramon.caddy"
  if grep -q "Content-Security-Policy" "$SR_SITE"; then
    if ! grep -qF "$CSP_MEDIA" "$SR_SITE"; then
      sed -i "s/media-src 'none'/${CSP_MEDIA}/g" "$SR_SITE"
      sed -i "s/media-src \"none\"/${CSP_MEDIA}/g" "$SR_SITE"
      CADDY_RELOAD=1
    fi
  fi
fi

if [[ "$CADDY_RELOAD" -eq 1 ]]; then
  if command -v caddy >/dev/null 2>&1; then
    if caddy validate --config "$CADDY_FILE"; then
      systemctl reload caddy
      log "Caddy recargado (San Ramón + marketing; Jean Piaget intacto)"
    else
      log "ERROR: Caddyfile inválido; revise ${CADDY_SITES}/"
    fi
  else
    log "WARN: caddy no encontrado"
  fi
fi

log "Deploy OK -> $DIST_DIR ($(git rev-parse --short HEAD))"
