#!/usr/bin/env bash
# Instala timer systemd: calentamiento automático diario chip ↔ chip.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sie/app}"
ENV_FILE="/opt/sie/.env.wppconnect"

touch /var/log/sie-wpp-warmup.log
chmod 644 /var/log/sie-wpp-warmup.log

cp "${APP_DIR}/scripts/wppconnect/sie-wpp-warmup.service" /etc/systemd/system/
cp "${APP_DIR}/scripts/wppconnect/sie-wpp-warmup.timer" /etc/systemd/system/
sed -i 's/\r$//' /etc/systemd/system/sie-wpp-warmup.service
sed -i 's/\r$//' /etc/systemd/system/sie-wpp-warmup.timer

if ! grep -q '^WPPCONNECT_TYPING_MIN_MS=' "$ENV_FILE" 2>/dev/null; then
  cat >> "$ENV_FILE" <<'EOF'
WPPCONNECT_TYPING_MIN_MS=10000
WPPCONNECT_TYPING_MAX_MS=18000
WPPCONNECT_WARMUP_ROUNDS=3
WPPCONNECT_WARMUP_PAUSE_MIN_MS=15000
WPPCONNECT_WARMUP_PAUSE_MAX_MS=35000
EOF
fi

systemctl daemon-reload
systemctl enable sie-wpp-warmup.timer
systemctl start sie-wpp-warmup.timer

echo "OK — calentamiento diario programado (09:30–10:00 Lima)."
echo "Estado timer: systemctl status sie-wpp-warmup.timer"
echo "Próxima ejecución: systemctl list-timers sie-wpp-warmup.timer"
echo "Ejecutar ahora: systemctl start sie-wpp-warmup.service"
echo "Log: tail -f /var/log/sie-wpp-warmup.log"
