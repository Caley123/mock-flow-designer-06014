#!/usr/bin/env node
/** Diagnóstico rápido: tokens WPPConnect como la cola notify */
import { createWppClient, loadEnvFileSync } from './lib/wppClient.mjs';

loadEnvFileSync('/opt/sie/.env.wppconnect');
const wpp = createWppClient();
const sessions = (process.env.WPPCONNECT_SESSIONS || '').split(',').map((s) => s.trim()).filter(Boolean);

console.log('SECRET_KEY set:', Boolean(process.env.WPPCONNECT_SECRET_KEY));
for (const s of sessions) {
  try {
    const token = await wpp.getToken(s);
    const ok = await wpp.isConnected(s);
    console.log(s, 'token:', token ? 'OK' : 'EMPTY', 'connected:', ok);
  } catch (e) {
    console.log(s, 'ERROR:', e.message);
  }
}
