#!/usr/bin/env node
/**
 * Calentamiento chip ↔ chip: mensajes variados + indicador "escribiendo" ≥10 s.
 * Uso manual o vía systemd timer (sie-wpp-warmup.timer).
 */
import { createWppClient, loadEnvFileSync } from './lib/wppClient.mjs';
import { pickWarmupMessage, getBankStats } from './lib/messageVariety.mjs';

const ENV_FILE = process.env.WPPCONNECT_ENV_FILE || '/opt/sie/.env.wppconnect';
loadEnvFileSync(ENV_FILE);

const SESSIONS = (
  process.env.WPPCONNECT_WARMUP_CHIPS ||
  process.env.WPPCONNECT_SESSIONS ||
  'sie-chip-01,sie-chip-02,sie-chip-03,sie-chip-04,sie-chip-05,sie-chip-06,sie-chip-07'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ROUNDS = Number(process.env.WPPCONNECT_WARMUP_ROUNDS || 3);
const PAUSE_MIN = Number(process.env.WPPCONNECT_WARMUP_PAUSE_MIN_MS || 15_000);
const PAUSE_MAX = Number(process.env.WPPCONNECT_WARMUP_PAUSE_MAX_MS || 35_000);
const TYPING_MIN = Number(process.env.WPPCONNECT_TYPING_MIN_MS || 10_000);
const TYPING_MAX = Number(process.env.WPPCONNECT_TYPING_MAX_MS || 18_000);

const wpp = createWppClient({ typingMinMs: TYPING_MIN, typingMaxMs: TYPING_MAX });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

async function resolveActiveChips() {
  const active = [];
  for (const session of SESSIONS) {
    const connected = await wpp.isConnected(session);
    if (!connected) {
      log(`SKIP ${session} — no conectado`);
      continue;
    }
    try {
      const phone = await wpp.getPhoneNumber(session);
      if (!phone) {
        log(`SKIP ${session} — sin número`);
        continue;
      }
      active.push({ session, phone });
      log(`${session} → ${phone}`);
    } catch (err) {
      log(`SKIP ${session} — ${err.message}`);
    }
  }
  return active;
}

async function main() {
  log('=== Inicio calentamiento diario ===');
  log(
    `Config: ${ROUNDS} ronda(s), typing ${TYPING_MIN / 1000}-${TYPING_MAX / 1000}s, pausa ${PAUSE_MIN / 1000}-${PAUSE_MAX / 1000}s`,
  );

  const stats = getBankStats();
  log(`Banco: ${stats.warmupCount} frases casuales`);

  const chips = await resolveActiveChips();
  if (chips.length < 2) {
    log(`ABORT — se necesitan ≥2 chips conectados (activos: ${chips.length})`);
    process.exit(0);
  }

  let sent = 0;
  let failed = 0;

  for (let round = 1; round <= ROUNDS; round++) {
    log(`--- Ronda ${round}/${ROUNDS} ---`);
    for (let i = 0; i < chips.length; i++) {
      const from = chips[i];
      const to = chips[(i + 1) % chips.length];
      const message = pickWarmupMessage();
      const typingMs = wpp.typingDelayMs();

      try {
        log(`${from.session} → ${to.phone} (escribiendo ${(typingMs / 1000).toFixed(1)}s)`);
        await wpp.sendMessage(from.session, to.phone, message, { typingMs });
        log(`  OK: ${message.slice(0, 72)}${message.length > 72 ? '…' : ''}`);
        sent++;
      } catch (err) {
        log(`  ERROR: ${err.message}`);
        failed++;
      }

      if (round < ROUNDS || i < chips.length - 1) {
        const pause = randomBetween(PAUSE_MIN, PAUSE_MAX);
        log(`  Pausa ${(pause / 1000).toFixed(0)}s`);
        await sleep(pause);
      }
    }
  }

  log(`=== Fin: ${sent} enviados, ${failed} fallos, ${chips.length} chips activos ===`);
  process.exit(failed > 0 && sent === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[warmup] FATAL: ${err.message}`);
  process.exit(1);
});
