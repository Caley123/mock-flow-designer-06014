from pathlib import Path

p = Path("/opt/sie-jp/.env.wppconnect")
lines = []
seen_s = seen_a = False
for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
    if line.startswith("WPPCONNECT_SESSIONS="):
        lines.append("WPPCONNECT_SESSIONS=jp-chip-01")
        seen_s = True
    elif line.startswith("WPPCONNECT_ALLOWLIST_PHONES="):
        lines.append(line)
        seen_a = True
    else:
        lines.append(line)
if not seen_s:
    lines.append("WPPCONNECT_SESSIONS=jp-chip-01")
if not seen_a:
    lines.append("WPPCONNECT_ALLOWLIST_PHONES=")
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("OK: un solo chip jp-chip-01; allowlist lista (vacía hasta que pongas los 6 números)")
