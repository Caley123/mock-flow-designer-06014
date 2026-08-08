#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { loadEnvFileSync } from './lib/wppClient.mjs';

loadEnvFileSync('/opt/sie/.env.wppconnect');
const api = (process.env.WPPCONNECT_INTERNAL_API || 'http://127.0.0.1:21465/api').replace(/\/$/, '');
const secret = process.env.WPPCONNECT_SECRET_KEY || '';
const session = 'sie-chip-04';
const url = `${api}/${session}/${secret}/generate-token`;
console.log('apiBase:', api);
console.log('secret len:', secret.length);
console.log('url (redacted):', `${api}/${session}/<secret>/generate-token`);

const res = await fetch(url, { method: 'POST' });
const raw = await res.text();
console.log('status:', res.status);
console.log('body:', raw.slice(0, 300));
