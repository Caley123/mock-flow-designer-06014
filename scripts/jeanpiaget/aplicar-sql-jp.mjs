#!/usr/bin/env node
/**
 * Aplica SQL al Supabase Jean Piaget usando service_role o DATABASE_URL.
 *
 * Uso:
 *   set JP_SUPABASE_URL=https://kelylvvoebneugnajiwv.supabase.co
 *   set JP_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/jeanpiaget/aplicar-sql-jp.mjs
 *
 * O:
 *   set JP_DATABASE_URL=postgresql://postgres:...@db.kelylvvoebneugnajiwv.supabase.co:5432/postgres
 *   node scripts/jeanpiaget/aplicar-sql-jp.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const URL = process.env.JP_SUPABASE_URL || 'https://kelylvvoebneugnajiwv.supabase.co';
const SERVICE = process.env.JP_SERVICE_ROLE_KEY || '';
const DATABASE_URL = process.env.JP_DATABASE_URL || '';

const ORDER = [
  'scripts/RLS_COMPLETO_SIE.sql',
  'scripts/PATCH_LOGIN_PGCrypto.sql',
  'FUNCION_VALIDAR_PASSWORD_BCRYPT.sql',
  'scripts/PATCH_BUSQUEDA_NOMBRE_V2.sql',
  'ACTUALIZAR_REGISTROS_LLEGADA_SALIDAS.sql',
  'PUBLIC_PORTAL_PADRES.sql',
  'scripts/PATCH_LIMITES_LLEGADA_NIVEL.sql',
  'scripts/DIAS_NO_LECTIVOS_2026.sql',
  'scripts/jeanpiaget/CREAR_USUARIOS_JP.sql',
];

async function runViaPg(sql, label) {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log('OK', label);
  } finally {
    await client.end();
  }
}

async function main() {
  if (!DATABASE_URL && !SERVICE) {
    console.error('Falta JP_DATABASE_URL o JP_SERVICE_ROLE_KEY');
    console.error('La service_role NO sirve para SQL arbitrario (solo REST).');
    console.error('Usa JP_DATABASE_URL=postgresql://postgres:CLAVE@db.kelylvvoebneugnajiwv.supabase.co:5432/postgres');
    process.exit(1);
  }

  if (!DATABASE_URL) {
    console.error('Con solo service_role no se puede ejecutar .sql completo.');
    console.error('Pide Database password en Supabase → Settings → Database.');
    process.exit(1);
  }

  for (const rel of ORDER) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) {
      console.warn('SKIP (no existe):', rel);
      continue;
    }
    const sql = readFileSync(path, 'utf8');
    console.log('→', rel);
    try {
      await runViaPg(sql, rel);
    } catch (e) {
      console.error('ERROR en', rel, e.message);
      // Sigue con el siguiente salvo error crítico
    }
  }
  console.log('Listo. Prueba login en https://jeanpiaget.asiscole.com');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
