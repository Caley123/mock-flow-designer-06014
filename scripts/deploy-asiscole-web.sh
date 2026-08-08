#!/usr/bin/env bash
# Despliega la landing comercial a /opt/asiscole-web y actualiza Caddy
# (asiscole.com = marketing, sanramon.asiscole.com = app San Ramón).
set -euo pipefail

WEB_DIR="/opt/asiscole-web"
DIST_DIR="${WEB_DIR}/dist"
SRC_DIR="${WEB_DIR}/src"
CADDY_SITES="/etc/caddy/sites.d"
CADDY_ROOT="/etc/caddy/Caddyfile"
LOG="/var/log/asiscole-web-deploy.log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

mkdir -p "$DIST_DIR" "$CADDY_SITES"

if [[ -d "$SRC_DIR" && -f "$SRC_DIR/package.json" ]]; then
  cd "$SRC_DIR"
  npm ci --no-audit --no-fund
  npm run build
  rsync -a --delete "${SRC_DIR}/dist/" "$DIST_DIR/"
  log "Build marketing OK"
elif [[ -d "/tmp/asiscole-web-dist" ]]; then
  rsync -a --delete /tmp/asiscole-web-dist/ "$DIST_DIR/"
  log "Sync marketing desde /tmp/asiscole-web-dist"
else
  log "WARN: no hay fuente de marketing (SRC_DIR ni /tmp/asiscole-web-dist)"
fi

# Caddy: marketing en asiscole.com + app en sanramon
if [[ -f "${SRC_DIR}/../scripts/asiscole-marketing-caddy.caddy" ]]; then
  MARKETING_CADDY="${SRC_DIR}/../scripts/asiscole-marketing-caddy.caddy"
elif [[ -f /opt/sie/app/scripts/asiscole-marketing-caddy.caddy ]]; then
  MARKETING_CADDY="/opt/sie/app/scripts/asiscole-marketing-caddy.caddy"
else
  MARKETING_CADDY=""
fi

SANRAMON_CADDY="/opt/sie/app/scripts/sanramon-caddy.caddy"
if [[ ! -f "$SANRAMON_CADDY" ]]; then
  SANRAMON_CADDY=""
fi

if [[ -n "$MARKETING_CADDY" ]]; then
  cp "$MARKETING_CADDY" "${CADDY_SITES}/00-asiscole.caddy"
  sed -i 's/\r$//' "${CADDY_SITES}/00-asiscole.caddy"
  log "Caddy marketing -> 00-asiscole.caddy"
fi

if [[ -n "$SANRAMON_CADDY" ]]; then
  cp "$SANRAMON_CADDY" "${CADDY_SITES}/01-sanramon.caddy"
  sed -i 's/\r$//' "${CADDY_SITES}/01-sanramon.caddy"
  log "Caddy San Ramón -> 01-sanramon.caddy"
fi

if [[ ! -f "$CADDY_ROOT" ]] || ! grep -q 'sites.d' "$CADDY_ROOT" 2>/dev/null; then
  printf '%s\n' 'import /etc/caddy/sites.d/*.caddy' >"$CADDY_ROOT"
fi

if caddy validate --config "$CADDY_ROOT"; then
  systemctl reload caddy
  log "Caddy recargado"
else
  log "ERROR: Caddyfile inválido"
  exit 1
fi

log "Deploy web OK -> $DIST_DIR"
