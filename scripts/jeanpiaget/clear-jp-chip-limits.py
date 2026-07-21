from pathlib import Path

p = Path("/opt/sie-jp/.env.wppconnect")
lines = []
seen = False
for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
    if line.startswith("WPPCONNECT_CHIP_HOURLY_LIMITS="):
        lines.append("WPPCONNECT_CHIP_HOURLY_LIMITS=")
        seen = True
    else:
        lines.append(line)
if not seen:
    lines.append("WPPCONNECT_CHIP_HOURLY_LIMITS=")
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("OK")
