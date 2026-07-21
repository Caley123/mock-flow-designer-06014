from pathlib import Path
p = Path('/opt/sie-jp/.env.wppconnect')
lines = []
for line in p.read_text(encoding='utf-8', errors='ignore').splitlines():
    if line.startswith('WPPCONNECT_SCHOOL_NAME='):
        lines.append('WPPCONNECT_SCHOOL_NAME="Colegio Jean Piaget"')
    elif line.startswith('VITE_APP_URL=') and ' ' in line.split('=',1)[1] and not line.split('=',1)[1].startswith(('"', "'")):
        lines.append(f'VITE_APP_URL="{line.split("=",1)[1]}"')
    else:
        lines.append(line)
p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('fixed', p)
