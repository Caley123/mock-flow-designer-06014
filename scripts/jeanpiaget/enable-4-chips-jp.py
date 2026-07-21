from pathlib import Path

p = Path("/opt/sie-jp/.env.wppconnect")
lines = []
seen_s = seen_m = False
for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
    if line.startswith("WPPCONNECT_SESSIONS="):
        lines.append("WPPCONNECT_SESSIONS=jp-chip-01,jp-chip-02,jp-chip-03,jp-chip-04")
        seen_s = True
    elif line.startswith("WPPCONNECT_CHIP_PHONES="):
        lines.append(line)
        seen_m = True
    else:
        lines.append(line)
if not seen_s:
    lines.append("WPPCONNECT_SESSIONS=jp-chip-01,jp-chip-02,jp-chip-03,jp-chip-04")
if not seen_m:
    # placeholder vacío: hasta cargar números, NO envía a nadie (chipRouting false si vacío)
    lines.append("WPPCONNECT_CHIP_PHONES=")
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("4 chips listos; falta WPPCONNECT_CHIP_PHONES con 24 números")
