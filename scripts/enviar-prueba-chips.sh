#!/usr/bin/env bash
# Prueba de envío: rudeus1-6 desde chips 01/02/03 + mensajes entre chips + 949261503
set -euo pipefail

ENV_FILE="/opt/sie/.env.wppconnect"
API="http://127.0.0.1:21465/api"
TARGET="51949261503"

source "$ENV_FILE"
SECRET="$WPPCONNECT_SECRET_KEY"

token_for() {
  curl -s -X POST "$API/$1/$SECRET/generate-token" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

phone_of() {
  local session="$1" token
  token=$(token_for "$session")
  curl -s -H "Authorization: Bearer $token" "$API/$session/get-phone-number" | tr -dc '0-9'
}

send_msg() {
  local session="$1" phone="$2" text="$3" token resp
  token=$(token_for "$session")
  resp=$(curl -s -X POST "$API/$session/send-message" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\",\"isGroup\":false,\"message\":\"$text\"}")
  echo "[$session] -> $phone : $text"
  echo "  $resp"
  sleep 3
}

echo "=== Números de cada chip ==="
N1=$(phone_of sie-chip-01)
N2=$(phone_of sie-chip-02)
N3=$(phone_of sie-chip-03)
echo "chip-01: $N1"
echo "chip-02: $N2"
echo "chip-03: $N3"
echo "destino: $TARGET"
echo ""

echo "=== rudeus1-6 al $TARGET ==="
send_msg sie-chip-01 "$TARGET" "rudeus1"
send_msg sie-chip-02 "$TARGET" "rudeus2"
send_msg sie-chip-03 "$TARGET" "rudeus3"
send_msg sie-chip-01 "$TARGET" "rudeus4"
send_msg sie-chip-02 "$TARGET" "rudeus5"
send_msg sie-chip-03 "$TARGET" "rudeus6"

echo ""
echo "=== Entre chips ==="
[ -n "$N1" ] && [ -n "$N2" ] && send_msg sie-chip-01 "$N2" "01->02: rudeus rotacion"
[ -n "$N2" ] && [ -n "$N3" ] && send_msg sie-chip-02 "$N3" "02->03: rudeus rotacion"
[ -n "$N3" ] && [ -n "$N1" ] && send_msg sie-chip-03 "$N1" "03->01: rudeus rotacion"

echo ""
echo "=== Listo ==="
