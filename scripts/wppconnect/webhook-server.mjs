#!/usr/bin/env node
/**
 * Webhook mínimo para WPPConnect: marca mensajes entrantes como leídos (sendSeen).
 * Corre en el host (PM2/systemd), puerto 3099.
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';

const ENV_FILE = '/opt/sie/.env.wppconnect';
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

const PORT = Number(process.env.WPPCONNECT_WEBHOOK_PORT || 3099);
const API_BASE = (process.env.WPPCONNECT_INTERNAL_API || 'http://127.0.0.1:21465/api').replace(
  /\/$/,
  '',
);
const SESSION = process.env.WPPCONNECT_SESSION || 'sie-chip-01';
const TOKEN = process.env.WPPCONNECT_BEARER_TOKEN || '';

function extractPhone(payload) {
  const raw =
    payload?.phone ||
    payload?.from ||
    payload?.message?.from ||
    payload?.data?.from ||
    payload?.body?.from;
  if (!raw) return null;
  return String(raw).replace(/@c\.us$|@s\.whatsapp\.net$/, '');
}

async function markSeen(phone) {
  if (!TOKEN || !phone) return;
  await fetch(`${API_BASE}/${SESSION}/send-seen`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ phone, isGroup: false }),
  }).catch(() => {});
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/wpp-webhook') {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    void (async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const event = payload?.event || payload?.type || '';
        const fromMe = payload?.fromMe ?? payload?.message?.fromMe ?? false;
        if (!fromMe && (event === 'onmessage' || event === 'message' || payload?.body)) {
          const phone = extractPhone(payload);
          if (phone) await markSeen(phone);
        }
      } catch {
        // ignorar JSON inválido
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    })();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[wpp-webhook] escuchando en 127.0.0.1:${PORT} sesión=${SESSION}`);
});
