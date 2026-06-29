/**
 * Cliente WPPConnect interno (localhost:21465).
 */
import { readFileSync, existsSync } from 'node:fs';

const tokenCache = new Map();

export function loadEnvFileSync(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"'))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

export function createWppClient(options = {}) {
  const apiBase = (options.apiBase || process.env.WPPCONNECT_INTERNAL_API || 'http://127.0.0.1:21465/api').replace(
    /\/$/,
    '',
  );
  const secretKey = options.secretKey || process.env.WPPCONNECT_SECRET_KEY || '';

  async function getToken(session) {
    const cached = tokenCache.get(session);
    if (cached && cached.expires > Date.now()) return cached.token;
    const res = await fetch(`${apiBase}/${session}/${secretKey}/generate-token`);
    const json = await res.json().catch(() => ({}));
    const token = json.token || '';
    if (!token) throw new Error(`No token for ${session}`);
    tokenCache.set(session, { token, expires: Date.now() + 50 * 60 * 1000 });
    return token;
  }

  async function apiPost(session, route, body) {
    const token = await getToken(session);
    const res = await fetch(`${apiBase}/${session}${route}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text().catch(() => res.statusText);
    if (!res.ok) {
      const err = new Error(raw.slice(0, 200) || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  }

  async function isConnected(session) {
    try {
      const token = await getToken(session);
      const res = await fetch(`${apiBase}/${session}/check-connection-session`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      return json.status === true || json.message === 'Connected' || json.connected === true;
    } catch {
      return false;
    }
  }

  async function sendMessage(session, phone, message) {
    await apiPost(session, '/typing', { phone, isGroup: false, value: true }).catch(() => {});
    const typingMs = 2000 + Math.floor(Math.random() * 2000);
    await new Promise((r) => setTimeout(r, typingMs));
    const result = await apiPost(session, '/send-message', { phone, message, isGroup: false });
    await apiPost(session, '/typing', { phone, isGroup: false, value: false }).catch(() => {});
    return result;
  }

  return { getToken, apiPost, isConnected, sendMessage };
}
