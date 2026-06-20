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

export NODE_ENV=production
npm ci --no-audit --no-fund
npm run build

mkdir -p "$DIST_DIR"
rsync -a --delete "${APP_DIR}/dist/" "$DIST_DIR/"

log "Deploy OK -> $DIST_DIR ($(git rev-parse --short HEAD))"
