#!/usr/bin/env bash
# Jean Piaget — mapa 24 números → 4 chips × 6.
# Orden: chip-10 (6) | chip-07 (6) | chip-01 tutor (6) | chip-11 (6)
# Reemplazos: 04→10, 06→11. NOTIFY_TO_SELF + relay (01 directo a apoderado).
#
# Uso en VPS:
#   bash /opt/sie-jp/app/scripts/jeanpiaget/set-chip-phones-jp.sh
#   # o con 24 números en orden:
#   bash scripts/jeanpiaget/set-chip-phones-jp.sh n1 … n24
set -euo pipefail

# Orden: chip-10 (6) | chip-07 (6) | chip-01 tutor (6) | chip-11 (6)
DEFAULT_PHONES=(
  999122088 920745262 958022486 966883611 931050074 999142033
  966606900 964603438 999220022 982950034 966653848 969483649
  983505862 978526244 966048216 951386668 939572780 923823737
  900936300 979298623 917374325 998342755 942066435 996301050
)

if [[ $# -eq 0 ]]; then
  set -- "${DEFAULT_PHONES[@]}"
elif [[ $# -ne 24 ]]; then
  echo "ERROR: exactamente 24 números (6 por chip), o ninguno para usar el mapa por defecto. Recibidos: $#"
  exit 1
fi

export JP_PHONES="$*"
ENV_FILE="${WPPCONNECT_ENV_FILE:-/opt/sie-jp/.env.wppconnect}"
export JP_ENV_FILE="$ENV_FILE"

python3 <<'PY'
import os
from pathlib import Path

raw = os.environ["JP_PHONES"].split()
assert len(raw) == 24, raw

def norm(p: str) -> str:
    d = "".join(c for c in p if c.isdigit())
    if len(d) == 9 and d.startswith("9"):
        d = "51" + d
    return d

# Mismo orden que DEFAULT_PHONES / imagen operativa
chips = ["sie-chip-10", "sie-chip-07", "sie-chip-01", "sie-chip-11"]
labels = ["grupo-10", "grupo-07", "tutor-01", "grupo-11"]
blocks = []
for i, chip in enumerate(chips):
    phones = [norm(x) for x in raw[i * 6 : (i + 1) * 6]]
    blocks.append(f"{chip}:{','.join(phones)}")
    print(f"{chip} ({labels[i]}): {', '.join(phones)}")

mapping = "|".join(blocks)
sessions = ",".join(chips)

env_path = Path(os.environ["JP_ENV_FILE"])
if not env_path.exists():
    raise SystemExit(f"No existe {env_path}. Defina WPPCONNECT_ENV_FILE o cree el archivo.")

# 10↔07 relay; 11 solo recibe (emisor fijo chip-01); chip-01 envía directo a apoderado
relay_map = "sie-chip-10:sie-chip-07|sie-chip-07:sie-chip-10|sie-chip-11:sie-chip-01"

lines = env_path.read_text(encoding="utf-8", errors="ignore").splitlines()
out = []
seen_s = seen_m = seen_a = seen_sess = seen_r = seen_lim = False
seen_direct = seen_never = seen_self = False
for line in lines:
    if line.startswith("WPPCONNECT_SESSIONS="):
        out.append(f"WPPCONNECT_SESSIONS={sessions}")
        seen_s = True
    elif line.startswith("WPPCONNECT_SESSION="):
        out.append("WPPCONNECT_SESSION=sie-chip-01")
        seen_sess = True
    elif line.startswith("WPPCONNECT_CHIP_PHONES="):
        out.append(f"WPPCONNECT_CHIP_PHONES='{mapping}'")
        seen_m = True
    elif line.startswith("WPPCONNECT_CHIP_RELAY_MAP="):
        out.append(f"WPPCONNECT_CHIP_RELAY_MAP={relay_map}")
        seen_r = True
    elif line.startswith("WPPCONNECT_NOTIFY_TO_SELF="):
        out.append("WPPCONNECT_NOTIFY_TO_SELF=true")
        seen_self = True
    elif line.startswith("WPPCONNECT_CHIP_DIRECT_SEND="):
        out.append("WPPCONNECT_CHIP_DIRECT_SEND=sie-chip-01")
        seen_direct = True
    elif line.startswith("WPPCONNECT_CHIP_NEVER_SEND="):
        out.append("WPPCONNECT_CHIP_NEVER_SEND=sie-chip-11")
        seen_never = True
    elif line.startswith("WPPCONNECT_CHIP_HOURLY_LIMITS="):
        out.append("WPPCONNECT_CHIP_HOURLY_LIMITS=")
        seen_lim = True
    elif line.startswith("WPPCONNECT_ALLOWLIST_PHONES="):
        out.append("WPPCONNECT_ALLOWLIST_PHONES=")
        seen_a = True
    else:
        out.append(line)
if not seen_s:
    out.append(f"WPPCONNECT_SESSIONS={sessions}")
if not seen_sess:
    out.append("WPPCONNECT_SESSION=sie-chip-01")
if not seen_m:
    out.append(f"WPPCONNECT_CHIP_PHONES='{mapping}'")
if not seen_r:
    out.append(f"WPPCONNECT_CHIP_RELAY_MAP={relay_map}")
if not seen_self:
    out.append("WPPCONNECT_NOTIFY_TO_SELF=true")
if not seen_direct:
    out.append("WPPCONNECT_CHIP_DIRECT_SEND=sie-chip-01")
if not seen_never:
    out.append("WPPCONNECT_CHIP_NEVER_SEND=sie-chip-11")
if not seen_lim:
    out.append("WPPCONNECT_CHIP_HOURLY_LIMITS=")
if not seen_a:
    out.append("WPPCONNECT_ALLOWLIST_PHONES=")
env_path.write_text("\n".join(out) + "\n", encoding="utf-8")
print("Guardado en", env_path)
print("WPPCONNECT_CHIP_PHONES=", mapping)
print("WPPCONNECT_CHIP_RELAY_MAP=", relay_map)
print("DIRECT=sie-chip-01 NEVER=sie-chip-11 NOTIFY_TO_SELF=true")
PY

if systemctl is-active --quiet sie-jp-wpp-notify-queue 2>/dev/null; then
  systemctl restart sie-jp-wpp-notify-queue
  sleep 1
  curl -s http://127.0.0.1:3102/status || true
  echo
  journalctl -u sie-jp-wpp-notify-queue -n 6 --no-pager
else
  echo "Aviso: sie-jp-wpp-notify-queue no está activo; reinicie la cola cuando despliegue."
fi
