#!/usr/bin/env bash
# Calienta chips: mensajes variados entre sí (banco de 500+ frases casuales).
# Uso: bash scripts/wppconnect/calentar-chips.sh
#      CHIPS=sie-chip-01,sie-chip-02 ROUNDS=3 bash scripts/wppconnect/calentar-chips.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sie/app}"
ENV_FILE="${ENV_FILE:-/opt/sie/.env.wppconnect}"
API="${WPPCONNECT_INTERNAL_API:-http://127.0.0.1:21465/api}"
CHIPS="${CHIPS:-sie-chip-01,sie-chip-02,sie-chip-03}"
ROUNDS="${ROUNDS:-2}"
PAUSE_MIN="${PAUSE_MIN:-8}"
PAUSE_MAX="${PAUSE_MAX:-25}"

source "$ENV_FILE"
SECRET="$WPPCONNECT_SECRET_KEY"

pick_warmup_msg() {
  node "${APP_DIR}/scripts/wppconnect/lib/pickWarmupCli.mjs"
}

token_for() {
  curl -sf -X POST "$API/$1/$SECRET/generate-token" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

phone_of() {
  local session="$1" token
  token=$(token_for "$session")
  curl -sf -H "Authorization: Bearer $token" "$API/$session/get-phone-number" | tr -dc '0-9'
}

send_msg() {
  local session="$1" phone="$2" text="$3" token resp
  token=$(token_for "$session")
  resp=$(curl -sf -X POST "$API/$session/send-message" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "$(node -e "console.log(JSON.stringify({phone:process.argv[1],isGroup:false,message:process.argv[2]}))" "$phone" "$text")")
  echo "[$session] → $phone"
  echo "  $(echo "$text" | head -c 80)..."
  if ! echo "$resp" | grep -q '"status":"success"'; then
    echo "  RESP: ${resp:0:200}"
  fi
  sleep "$(node -e "const a=+process.argv[1],b=+process.argv[2];console.log(Math.floor(Math.random()*(b-a+1))+a)" "$PAUSE_MIN" "$PAUSE_MAX")"
}

declare -A PHONES
IFS=',' read -ra CHIP_LIST <<< "$CHIPS"
for CHIP in "${CHIP_LIST[@]}"; do
  CHIP=$(echo "$CHIP" | xargs)
  PHONES[$CHIP]=$(phone_of "$CHIP" || true)
  echo "$CHIP → ${PHONES[$CHIP]:-(sin número)}"
done

echo ""
echo "=== Calentamiento: $ROUNDS ronda(s), pausa ${PAUSE_MIN}-${PAUSE_MAX}s ==="

for ((r = 1; r <= ROUNDS; r++)); do
  echo "--- Ronda $r ---"
  for i in "${!CHIP_LIST[@]}"; do
    FROM=$(echo "${CHIP_LIST[$i]}" | xargs)
    TO_IDX=$(( (i + 1) % ${#CHIP_LIST[@]} ))
    TO=$(echo "${CHIP_LIST[$TO_IDX]}" | xargs)
    FROM_PHONE="${PHONES[$FROM]:-}"
    TO_PHONE="${PHONES[$TO]:-}"
    if [[ -z "$FROM_PHONE" || -z "$TO_PHONE" ]]; then
      echo "SKIP $FROM → $TO (falta número)"
      continue
    fi
    MSG=$(pick_warmup_msg)
    send_msg "$FROM" "$TO_PHONE" "$MSG"
  done
done

echo "=== FIN calentamiento ==="
node "${APP_DIR}/scripts/wppconnect/lib/pickWarmupCli.mjs" --stats 2>/dev/null || true
