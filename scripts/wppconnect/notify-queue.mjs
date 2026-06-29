#!/usr/bin/env node
/**
 * Cola de notificaciones WhatsApp — rotación round-robin, failover y anti-baneo.
 * Puerto 3100 — POST /enqueue (desde el SIE) | GET /health | GET /status
 */
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildArrivalMessage } from './lib/arrivalMessage.mjs';
import { createWppClient, loadEnvFileSync } from './lib/wppClient.mjs';

const ENV_FILE = process.env.WPPCONNECT_ENV_FILE || '/opt/sie/.env.wppconnect';
loadEnvFileSync(ENV_FILE);

const PORT = Number(process.env.WPPCONNECT_NOTIFY_PORT || 3100);
const NOTIFY_SECRET = process.env.WPPCONNECT_NOTIFY_SECRET || '';
const STATE_FILE = process.env.WPPCONNECT_ROUND_ROBIN_STATE || '/opt/sie/.wpp-round-robin-state.json';
const JITTER_MIN = Number(process.env.WPPCONNECT_JITTER_MIN_MS || 4000);
const JITTER_MAX = Number(process.env.WPPCONNECT_JITTER_MAX_MS || 9000);
/** Tope por chip por hora calendario en Lima (se reinicia cada :00 hora Perú). */
const MAX_PER_HOUR = Number(process.env.WPPCONNECT_MAX_PER_HOUR_PER_CHIP || 250);
const RATE_TIMEZONE = process.env.WPPCONNECT_RATE_TIMEZONE || 'America/Lima';
const APP_URL = process.env.VITE_APP_URL || 'https://asiscole.com';

const SESSIONS = (
  process.env.WPPCONNECT_SESSIONS ||
  'sie-chip-01,sie-chip-02,sie-chip-03,sie-chip-04,sie-chip-05,sie-chip-06,sie-chip-07'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const wpp = createWppClient();
const queues = new Map();
const processing = new Map();
const hourlyCounts = new Map();

const limaHourFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: RATE_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadRoundRobinState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return { index: 0 };
}

function saveRoundRobinState(state) {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('[notify-queue] no se pudo guardar estado RR:', err.message);
  }
}

/** Clave YYYY-MM-DDTHH en zona horaria Perú (America/Lima). */
function hourKey() {
  const parts = limaHourFormatter.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return `${get('year')}-${get('month')}-${get('day')}T${hour}`;
}

function canSendOnSession(session) {
  const key = `${session}:${hourKey()}`;
  const count = hourlyCounts.get(key) || 0;
  return count < MAX_PER_HOUR;
}

function recordSend(session) {
  const key = `${session}:${hourKey()}`;
  hourlyCounts.set(key, (hourlyCounts.get(key) || 0) + 1);
}

async function pickSession() {
  const state = loadRoundRobinState();
  const start = state.index % SESSIONS.length;

  for (let i = 0; i < SESSIONS.length; i++) {
    const idx = (start + i) % SESSIONS.length;
    const session = SESSIONS[idx];
    if (!canSendOnSession(session)) continue;
    if (await wpp.isConnected(session)) {
      state.index = (idx + 1) % SESSIONS.length;
      saveRoundRobinState(state);
      return session;
    }
  }

  for (const session of SESSIONS) {
    if (canSendOnSession(session) && (await wpp.isConnected(session))) {
      return session;
    }
  }

  const fallback = SESSIONS[start];
  state.index = (start + 1) % SESSIONS.length;
  saveRoundRobinState(state);
  return fallback;
}

async function failoverSessions(excludeSession) {
  const connected = [];
  for (const session of SESSIONS) {
    if (session === excludeSession) continue;
    if (!canSendOnSession(session)) continue;
    if (await wpp.isConnected(session)) connected.push(session);
  }
  return connected;
}

async function deliver(job, session) {
  await wpp.sendMessage(session, job.phone, job.message);
  recordSend(session);
  return session;
}

async function processQueue(session) {
  if (processing.get(session)) return;
  processing.set(session, true);

  while (queues.get(session)?.length) {
    const job = queues.get(session).shift();
    let usedSession = job.assignedSession || session;
    try {
      usedSession = await deliver(job, usedSession);
      console.log(`[notify-queue] OK ${usedSession} -> ${job.phone} estudiante=${job.studentId}`);
    } catch (err) {
      console.error(`[notify-queue] fallo ${usedSession}:`, err.message);
      const alternates = await failoverSessions(usedSession);
      let sent = false;
      for (const alt of alternates) {
        try {
          await deliver(job, alt);
          console.log(`[notify-queue] failover OK ${alt} -> ${job.phone}`);
          sent = true;
          break;
        } catch (e2) {
          console.error(`[notify-queue] failover fallo ${alt}:`, e2.message);
        }
      }
      if (!sent) console.error(`[notify-queue] sin chip disponible para ${job.phone}`);
    }

    const jitter = randomBetween(JITTER_MIN, JITTER_MAX);
    await sleep(jitter);
  }

  processing.set(session, false);
}

function enqueue(job) {
  const session = job.assignedSession;
  if (!queues.has(session)) queues.set(session, []);
  queues.get(session).push(job);
  void processQueue(session);
}

async function handleEnqueue(body) {
  const { phone, student, record, appUrl } = body;
  if (!phone || !student?.fullName) {
    return { status: 400, json: { error: 'Faltan phone o student.fullName' } };
  }

  const message = buildArrivalMessage(student, record || {}, appUrl || APP_URL);
  const assignedSession = await pickSession();

  const job = {
    phone: String(phone).replace(/\D/g, ''),
    message,
    studentId: student.id || student.fullName,
    assignedSession,
    enqueuedAt: Date.now(),
  };

  enqueue(job);

  return {
    status: 202,
    json: {
      queued: true,
      session: assignedSession,
      sessions: SESSIONS.length,
    },
  };
}

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function checkAuth(req) {
  if (!NOTIFY_SECRET) return true;
  return req.headers['x-sie-notify-key'] === NOTIFY_SECRET;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return jsonResponse(res, 200, { ok: true, sessions: SESSIONS.length });
  }

  if (req.method === 'GET' && req.url === '/status') {
    const status = {
      config: {
        maxPerChipPerHour: MAX_PER_HOUR,
        rateWindow: 'calendar-hour',
        rateTimezone: RATE_TIMEZONE,
        limaHourKey: hourKey(),
        jitterMs: [JITTER_MIN, JITTER_MAX],
        sessions: SESSIONS.length,
      },
    };
    for (const s of SESSIONS) {
      const key = `${s}:${hourKey()}`;
      status[s] = {
        queueLength: queues.get(s)?.length || 0,
        sentThisHour: hourlyCounts.get(key) || 0,
        maxPerHour: MAX_PER_HOUR,
      };
    }
    status.roundRobin = loadRoundRobinState();
    status.totalQueued = [...queues.values()].reduce((n, q) => n + q.length, 0);
    return jsonResponse(res, 200, status);
  }

  if (req.method === 'POST' && req.url === '/enqueue') {
    if (!checkAuth(req)) {
      return jsonResponse(res, 401, { error: 'Unauthorized' });
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      void (async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const result = await handleEnqueue(payload);
          jsonResponse(res, result.status, result.json);
        } catch (err) {
          jsonResponse(res, 400, { error: err.message || 'Bad request' });
        }
      })();
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `[notify-queue] ${SESSIONS.length} chips | max ${MAX_PER_HOUR}/chip/hora Lima (${RATE_TIMEZONE}) | jitter ${JITTER_MIN}-${JITTER_MAX}ms | :${PORT}`,
  );
  console.log(`[notify-queue] sesiones: ${SESSIONS.join(', ')}`);
});
