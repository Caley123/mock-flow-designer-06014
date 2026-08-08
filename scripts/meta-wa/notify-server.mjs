#!/usr/bin/env node
/**
 * Proxy seguro WhatsApp Cloud API (Meta) — el token NUNCA va al frontend.
 * Puerto 3101 — POST /notify | GET /health
 *
 * Env (/opt/sie/.env.meta-wa):
 *   META_WA_TOKEN=...
 *   META_WA_PHONE_NUMBER_ID=1327961573730406
 *   META_WA_API_VERSION=v25.0
 *   META_WA_NOTIFY_SECRET=  (opcional, header X-SIE-Notify-Key)
 *   META_WA_MODE=auto|text|template   (default auto)
 *   META_WA_TEMPLATE=aviso_llegada    (o hello_world mientras aprueban)
 *   META_WA_TEMPLATE_LANG=es
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';

const ENV_FILE = process.env.META_WA_ENV_FILE || '/opt/sie/.env.meta-wa';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(ENV_FILE);

const PORT = Number(process.env.META_WA_PORT || 3101);
const TOKEN = (process.env.META_WA_TOKEN || '').trim();
const PHONE_NUMBER_ID = (process.env.META_WA_PHONE_NUMBER_ID || '').trim();
const API_VERSION = (process.env.META_WA_API_VERSION || 'v25.0').trim();
const NOTIFY_SECRET = (process.env.META_WA_NOTIFY_SECRET || '').trim();
const MODE = (process.env.META_WA_MODE || 'auto').trim().toLowerCase();
const TEMPLATE = (process.env.META_WA_TEMPLATE || 'aviso_llegada').trim();
const TEMPLATE_LANG = (process.env.META_WA_TEMPLATE_LANG || 'es').trim();

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  if (digits.length === 11 && digits.startsWith('51')) return digits;
  if (digits.length >= 10) return digits;
  return null;
}

function buildArrivalText(body) {
  if (body.text && String(body.text).trim()) return String(body.text).trim();
  const s = body.student || {};
  const r = body.record || {};
  const name = s.fullName || 'el estudiante';
  const fecha = (r.date || '').slice(0, 10);
  const hora = r.arrivalTime || '';
  const status = r.status || 'registrada';
  const lines = [
    'Hola,',
    '',
    `*${name}* registró su llegada.`,
    fecha ? `*Fecha:* ${fecha}` : null,
    hora ? `*Hora:* ${hora}` : null,
    `*Estado:* ${status}`,
    s.level ? `*Nivel:* ${s.level}` : null,
    s.grade ? `*Grado:* ${s.grade}` : null,
    s.section ? `*Sección:* ${s.section}` : null,
    '',
    '_Notificación automática Asiscole._',
  ].filter(Boolean);
  return lines.join('\n');
}

async function metaSend(payload) {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function textPayload(to, text) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { preview_url: false, body: text.slice(0, 4096) },
  };
}

function templatePayload(to, body) {
  const s = body.student || {};
  const r = body.record || {};
  const name = String(s.fullName || 'Estudiante').slice(0, 60);
  const hora = String(r.arrivalTime || '--:--').slice(0, 20);
  const fecha = String((r.date || '').slice(0, 10) || '--').slice(0, 20);
  const status = String(r.status || 'registrada').slice(0, 40);

  const base = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: TEMPLATE,
      language: { code: TEMPLATE_LANG },
    },
  };

  // hello_world y plantillas sin variables
  if (TEMPLATE === 'hello_world' || process.env.META_WA_TEMPLATE_NO_VARS === '1') {
    return base;
  }

  base.template.components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: name },
        { type: 'text', text: hora },
        { type: 'text', text: fecha },
        { type: 'text', text: status },
      ],
    },
  ];
  return base;
}

async function sendNotify(body) {
  const to = normalizePhone(body.phone);
  if (!to) return { ok: false, error: 'Teléfono inválido', status: 400 };
  if (!TOKEN || !PHONE_NUMBER_ID) {
    return { ok: false, error: 'Falta META_WA_TOKEN o META_WA_PHONE_NUMBER_ID', status: 500 };
  }

  const text = buildArrivalText(body);
  const mode = (body.mode || MODE).toLowerCase();

  if (mode === 'template') {
    const result = await metaSend(templatePayload(to, body));
    if (!result.ok) {
      return {
        ok: false,
        error: result.data?.error?.message || JSON.stringify(result.data),
        status: result.status,
        meta: result.data,
      };
    }
    return { ok: true, mode: 'template', to, meta: result.data };
  }

  if (mode === 'text') {
    const result = await metaSend(textPayload(to, text));
    if (!result.ok) {
      return {
        ok: false,
        error: result.data?.error?.message || JSON.stringify(result.data),
        status: result.status,
        meta: result.data,
      };
    }
    return { ok: true, mode: 'text', to, meta: result.data };
  }

  // auto: texto → si Meta exige plantilla, plantilla
  const textResult = await metaSend(textPayload(to, text));
  if (textResult.ok) {
    return { ok: true, mode: 'text', to, meta: textResult.data };
  }

  const code = textResult.data?.error?.code;
  const needsTemplate =
    code === 131047 ||
    code === 131026 ||
    code === 131051 ||
    /template|24.?hour|outside/i.test(String(textResult.data?.error?.message || ''));

  if (!needsTemplate) {
    return {
      ok: false,
      error: textResult.data?.error?.message || JSON.stringify(textResult.data),
      status: textResult.status,
      meta: textResult.data,
    };
  }

  const tplResult = await metaSend(templatePayload(to, body));
  if (!tplResult.ok) {
    return {
      ok: false,
      error:
        tplResult.data?.error?.message ||
        textResult.data?.error?.message ||
        'No se pudo enviar (texto ni plantilla)',
      status: tplResult.status,
      meta: { text: textResult.data, template: tplResult.data },
    };
  }
  return { ok: true, mode: 'template-fallback', to, meta: tplResult.data };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function pathOf(url) {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

const server = http.createServer(async (req, res) => {
  let path = pathOf(req.url || '/');
  if (path.startsWith('/meta-wa')) path = path.slice('/meta-wa'.length) || '/';

  if (req.method === 'GET' && (path === '/health' || path === '/')) {
    return json(res, 200, {
      ok: true,
      service: 'meta-wa-notify',
      configured: Boolean(TOKEN && PHONE_NUMBER_ID),
      mode: MODE,
      template: TEMPLATE,
    });
  }

  if (req.method === 'POST' && (path === '/notify' || path === '/send')) {
    if (NOTIFY_SECRET) {
      const key = req.headers['x-sie-notify-key'];
      if (key !== NOTIFY_SECRET) {
        return json(res, 401, { ok: false, error: 'No autorizado' });
      }
    }
    try {
      const body = await readBody(req);
      const result = await sendNotify(body);
      return json(res, result.ok ? 200 : result.status || 502, result);
    } catch (err) {
      return json(res, 400, { ok: false, error: err.message || 'JSON inválido' });
    }
  }

  json(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[meta-wa] listening on 127.0.0.1:${PORT} mode=${MODE} template=${TEMPLATE}`);
});
