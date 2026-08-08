#!/usr/bin/env bash
# Envío por rondas con protección ante desconexión.
# - Verifica conexión ANTES de cada mensaje
# - Si un chip se desconecta (Unpaired), ABORTA el resto de ese chip (no sigue quemando)
# - Pausa ~2 min entre rondas
#
# Uso:
#   JOBS_FILE=/tmp/jobs.txt bash broadcast-rondas-seguro.sh
#   (cada línea: telefono_local|sesion   ej. 999122088|sie-chip-04)
set -euo pipefail

ENV_FILE="${ENV_FILE:-/opt/sie/.env.wppconnect}"
API="${WPPCONNECT_INTERNAL_API:-http://127.0.0.1:21465/api}"
API="${API%/}"
LOG="${LOG:-/tmp/broadcast_seguro_$(date +%Y%m%d_%H%M%S).log}"
PAUSE_MIN="${PAUSE_MIN:-120}"
PAUSE_MAX="${PAUSE_MAX:-150}"
TYPING_MIN="${TYPING_MIN:-30}"
TYPING_MAX="${TYPING_MAX:-40}"
MESSAGE_FILE="${MESSAGE_FILE:-}"

source "$ENV_FILE"
SECRET="${WPPCONNECT_SECRET_KEY:-}"

token_for() {
  curl -sf -X POST "$API/$1/$SECRET/generate-token" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'
}

is_connected() {
  local session="$1" token resp
  token=$(token_for "$session") || return 1
  [[ -n "$token" ]] || return 1
  resp=$(curl -sf -H "Authorization: Bearer $token" "$API/$session/check-connection-session" || true)
  echo "$resp" | grep -qiE '"status"\s*:\s*true|"message"\s*:\s*"Connected"|Connected'
}

rand_between() {
  local lo="$1" hi="$2"
  echo $(( lo + RANDOM % (hi - lo + 1) ))
}

if [[ -n "$MESSAGE_FILE" && -f "$MESSAGE_FILE" ]]; then
  MESSAGE=$(cat "$MESSAGE_FILE")
else
  MESSAGE=$(cat <<'EOF'
✨ *Asiscole — Colegio Jean Piaget* ✨

Estimada familia, 👋

Le saludamos con mucho gusto. Somos el equipo de *Asiscole*, el sistema de asistencia escolar de su institución.

📲 Este es un *mensaje de prueba* de nuestro canal oficial.
A partir de ahora, por este número recibirá avisos automáticos cuando su hijo/a registre:

🟢 *Entrada* al colegio
🔴 *Salida* del colegio

━━━━━━━━━━━━━━━━━━━━
✅ *Le pedimos amablemente:*

1️⃣ *Guarde este número* en sus contactos
    (sugerencia: «Asiscole Jean Piaget»)

2️⃣ *Responda este mensaje* con la palabra:
    *Recibido* ✅

Así mantenemos una comunicación estable y segura con todas las familias.
━━━━━━━━━━━━━━━━━━━━

🌐 *Esta es nuestra página oficial Asiscole:*
https://asiscole.com/

👨‍👩‍👧 *Portal de padres:*
https://jeanpiaget.asiscole.com/portal-padres

💡 En el portal puede consultar llegadas, salidas y el historial de asistencia con el DNI del estudiante.

Gracias por su confianza y colaboración. 💙
_Equipo Asiscole — Colegio Jean Piaget_
EOF
)
fi

if [[ -z "${JOBS_FILE:-}" || ! -f "$JOBS_FILE" ]]; then
  echo "ERROR: defina JOBS_FILE con líneas telefono|sesion" >&2
  exit 1
fi

# Cargar colas por sesión (orden de aparición)
declare -A QUEUES=()
declare -a CHIP_ORDER=()
declare -A CHIP_SEEN=()
declare -A CHIP_DEAD=()

while IFS= read -r line || [[ -n "$line" ]]; do
  line=$(echo "$line" | xargs)
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  local_phone="${line%%|*}"
  session="${line##*|}"
  local_phone=$(echo "$local_phone" | xargs)
  session=$(echo "$session" | xargs)
  [[ -z "$local_phone" || -z "$session" ]] && continue
  if [[ -z "${CHIP_SEEN[$session]:-}" ]]; then
    CHIP_SEEN[$session]=1
    CHIP_ORDER+=("$session")
    QUEUES[$session]="$local_phone"
  else
    QUEUES[$session]="${QUEUES[$session]} $local_phone"
  fi
done < "$JOBS_FILE"

send_one() {
  local SESSION="$1" LOCAL="$2"
  local PHONE="51${LOCAL}" TOKEN TYPING PAYLOAD RESP

  if [[ -n "${CHIP_DEAD[$SESSION]:-}" ]]; then
    echo "  SKIP $PHONE ($SESSION marcado muerto)"
    return 2
  fi

  if ! is_connected "$SESSION"; then
    echo "  DISCONNECT_PRE $SESSION — abortando cola de este chip"
    CHIP_DEAD[$SESSION]=1
    return 2
  fi

  TOKEN=$(token_for "$SESSION")
  TYPING=$(rand_between "$TYPING_MIN" "$TYPING_MAX")
  echo "  Typing ${TYPING}s → $PHONE via $SESSION"
  curl -sf -X POST "$API/$SESSION/typing" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$PHONE\",\"isGroup\":false,\"value\":true}" >/dev/null || true
  sleep "$TYPING"

  # Re-check tras typing (puede haberse caído mientras “escribía”)
  if ! is_connected "$SESSION"; then
    echo "  DISCONNECT_DURING_TYPING $SESSION — abort cola"
    CHIP_DEAD[$SESSION]=1
    return 2
  fi

  PAYLOAD=$(node -e 'console.log(JSON.stringify({phone:process.argv[1],isGroup:false,message:process.argv[2]}))' "$PHONE" "$MESSAGE")
  RESP=$(curl -sS -X POST "$API/$SESSION/send-message" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" || echo '{"status":"error"}')

  curl -sf -X POST "$API/$SESSION/typing" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$PHONE\",\"isGroup\":false,\"value\":false}" >/dev/null || true

  if echo "$RESP" | grep -qiE 'Disconnected|não está ativa|not connected|Session Unpaired'; then
    echo "  DISCONNECT_ON_SEND $SESSION $PHONE — abort cola :: ${RESP:0:180}"
    CHIP_DEAD[$SESSION]=1
    return 2
  fi

  if echo "$RESP" | grep -q '"status":"success"'; then
    echo "  OK $PHONE via $SESSION"
    return 0
  fi
  echo "  FAIL $PHONE via $SESSION :: ${RESP:0:220}"
  return 1
}

exec > >(tee -a "$LOG") 2>&1
echo "=== INICIO SEGURO $(date -Is) log=$LOG ==="
echo "Chips: ${CHIP_ORDER[*]}"

# Convertir colas a arrays indexados
declare -A IDX=()
MAX_ROUNDS=0
for c in "${CHIP_ORDER[@]}"; do
  # shellcheck disable=SC2206
  arr=(${QUEUES[$c]})
  IDX[$c]=0
  n=${#arr[@]}
  (( n > MAX_ROUNDS )) && MAX_ROUNDS=$n
  echo "  $c → $n números"
done

OK=0
FAIL=0
SKIP=0

for ((r=0; r<MAX_ROUNDS; r++)); do
  echo ""
  echo "===== RONDA $((r+1))/$MAX_ROUNDS $(date -Is) ====="
  any=0
  for c in "${CHIP_ORDER[@]}"; do
    # shellcheck disable=SC2206
    arr=(${QUEUES[$c]})
    if (( r < ${#arr[@]} )); then
      any=1
      rc=0
      send_one "$c" "${arr[$r]}" || rc=$?
      if [[ $rc -eq 0 ]]; then OK=$((OK+1))
      elif [[ $rc -eq 2 ]]; then SKIP=$((SKIP+1))
      else FAIL=$((FAIL+1))
      fi
    fi
  done
  if (( any == 0 )); then
    break
  fi
  if (( r < MAX_ROUNDS - 1 )); then
    WAIT=$(rand_between "$PAUSE_MIN" "$PAUSE_MAX")
    echo "Pausa entre rondas: ${WAIT}s..."
    sleep "$WAIT"
  fi
done

echo ""
echo "=== FIN $(date -Is) OK=$OK FAIL=$FAIL SKIP_DEAD=$SKIP ==="
echo "Chips muertos: ${!CHIP_DEAD[*]:-ninguno}"
echo "$LOG" > /tmp/broadcast_seguro_latest.logpath
