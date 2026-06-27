# WhatsApp con WPPConnect Server (SIE / asiscole.com)

**WPPConnect** reemplaza a OpenWA en producción cuando necesitas sesiones que **no se caen** al apagar el celular o perder internet temporalmente. Los tokens quedan en disco (`tokens/` + `userDataDir/`) y el servidor los restaura al reiniciar.

OpenWA sigue disponible en el VPS (`:2785`) como respaldo, pero el frontend usa WPPConnect cuando `VITE_WPPCONNECT_ENABLED=true`.

## Arquitectura

| Componente | Puerto / ruta |
|------------|----------------|
| WPPConnect API (Docker) | `127.0.0.1:21465` |
| Proxy público (Caddy) | `https://asiscole.com/wpp-api/...` |
| Webhook sendSeen (host) | `127.0.0.1:3099/wpp-webhook` |
| OpenWA legacy | `127.0.0.1:2785` → `/api` |

## Instalación en el VPS (una vez)

Tras `git push` al repo:

```bash
ssh root@178.104.115.2
cd /opt/sie/app && git pull
bash scripts/instalar-wppconnect-vps.sh
bash scripts/wppconnect-mostrar-qr.sh
/opt/sie/deploy.sh   # rebuild frontend con variables WPPConnect
```

El script:

1. Clona [wppconnect-server](https://github.com/wppconnect-team/wppconnect-server) en `/opt/sie/wppconnect`
2. Aplica `scripts/wppconnect/config.ts` (`autoClose: 0`, `deviceSyncTimeout: 0`)
3. Levanta Docker (`sie-wppconnect`)
4. Genera token Bearer y guarda `/opt/sie/.env.wppconnect`
5. Actualiza `/opt/sie/.env.build` y recarga Caddy (`/wpp-api`)

## Vincular el chip (QR)

```bash
# En el VPS
bash /opt/sie/app/scripts/wppconnect-mostrar-qr.sh

# Descargar imagen QR a tu PC
ssh root@178.104.115.2 "curl -sf -H \"Authorization: Bearer \$(grep WPPCONNECT_BEARER_TOKEN /opt/sie/.env.wppconnect | cut -d= -f2)\" http://127.0.0.1:21465/api/sie-chip-01/qrcode-session -o /tmp/wpp-qr.png"
scp root@178.104.115.2:/tmp/wpp-qr.png .
```

Escanee con WhatsApp → Dispositivos vinculados → Vincular dispositivo.

Comprobar conexión:

```bash
curl -H "Authorization: Bearer TOKEN" http://127.0.0.1:21465/api/sie-chip-01/check-connection-session
```

## Variables de build (`.env.build` en VPS)

```env
VITE_WPPCONNECT_ENABLED=true
VITE_WPPCONNECT_API_URL=/wpp-api
VITE_WPPCONNECT_SESSION=sie-chip-01
VITE_WPPCONNECT_TOKEN=<bearer del generate-token>
VITE_OPENWA_ENABLED=false
VITE_APP_URL=https://asiscole.com
```

## Comportamiento “humano” en el SIE

`whatsappService.ts` con WPPConnect:

1. Activa **typing** (`/typing` value: true)
2. Espera **2–3 s** aleatorios
3. Envía mensaje (`/send-message`)
4. Desactiva typing

El webhook en el VPS marca **sendSeen** cuando un padre responde.

## Varias sesiones (7 chips)

Repita el flujo con nombres `sie-chip-02` … `sie-chip-07` y rote en un worker de cola (futuro). Por ahora el SIE usa una sesión (`VITE_WPPCONNECT_SESSION`).

## Comandos útiles

```bash
docker logs -f sie-wppconnect
docker compose -f /opt/sie/wppconnect/docker-compose.yml restart
pm2 logs sie-wpp-webhook
```

## Migración desde OpenWA

| Antes (OpenWA) | Ahora (WPPConnect) |
|----------------|-------------------|
| `VITE_OPENWA_*` | `VITE_WPPCONNECT_*` |
| `/api/sessions/.../send-text` | `/wpp-api/{session}/send-message` |
| Sesión UUID en dashboard | Token en disco + `startAllSession: true` |

Ver también: [OPENWA_WHATSAPP.md](./OPENWA_WHATSAPP.md) (legacy).
