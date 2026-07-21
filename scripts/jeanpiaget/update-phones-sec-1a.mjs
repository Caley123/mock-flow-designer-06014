/**
 * Actualiza telefono_contacto de estudiantes JP desde SEC 1A.xls
 * Match por DNI = codigo_barras
 *
 *   set JP_SERVICE_ROLE_KEY=...
 *   node scripts/jeanpiaget/update-phones-sec-1a.mjs "c:\Users\User\Downloads\SEC 1A (4).xls"
 *   node ... --dry-run
 */
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const URL = process.env.JP_SUPABASE_URL || 'https://kelylvvoebneugnajiwv.supabase.co';
const KEY =
  process.env.JP_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.JP_SUPABASE_KEY ||
  '';

const file =
  process.argv.find((a) => a.endsWith('.xls') || a.endsWith('.xlsx')) ||
  String.raw`c:\Users\User\Downloads\SEC 1A (4).xls`;
const dryRun = process.argv.includes('--dry-run');

function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  // quitar 51 si viene completo; guardamos 9 dígitos locales (como el resto del SIE)
  if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('9')) return d;
  return d;
}

function readPhones(path) {
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

  let headerRow = -1;
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i].map((c) => String(c).trim().toUpperCase());
    if (row.some((c) => c.includes('APELLIDOS')) && row.some((c) => c.includes('CELULAR') || c.includes('DOC'))) {
      headerRow = i;
      break;
    }
  }
  if (headerRow < 0) {
    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i].map((c) => String(c).trim().toUpperCase());
      if (row.some((c) => c.includes('APELLIDOS'))) {
        headerRow = i;
        break;
      }
    }
  }
  if (headerRow < 0) throw new Error('No se encontró encabezado');

  const headers = matrix[headerRow].map((c) => String(c).trim());
  const iNombre = headers.findIndex((h) => /APELLIDOS/i.test(h));
  const iDoc = headers.findIndex((h) => /NRO\.?\s*DOC|DNI/i.test(h));
  const iCel = headers.findIndex((h) => /CELULAR|TELEFONO|TELÉFONO|APODERADO/i.test(h));

  if (iDoc < 0 || iCel < 0) {
    throw new Error(`Columnas no encontradas. Headers: ${JSON.stringify(headers)}`);
  }

  const out = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r];
    const dni = String(row[iDoc] || '').replace(/\D/g, '');
    const phone = normPhone(row[iCel]);
    const nombre = String(row[iNombre] || '').trim();
    if (!dni || !phone) continue;
    out.push({ dni, phone, nombre });
  }
  return out;
}

async function main() {
  if (!KEY) {
    console.error('Falta JP_SERVICE_ROLE_KEY (o JP_SUPABASE_KEY)');
    process.exit(1);
  }

  const rows = readPhones(file);
  console.log(`Archivo: ${file}`);
  console.log(`Filas con DNI+celular: ${rows.length}`);
  console.log('Muestra:', rows.slice(0, 3));

  const sb = createClient(URL, KEY, { auth: { persistSession: false } });

  const { data: students, error } = await sb
    .from('estudiantes')
    .select('id_estudiante, codigo_barras, nombre_completo, telefono_contacto');
  if (error) throw error;

  const byDni = new Map(
    (students || []).map((s) => [String(s.codigo_barras || '').replace(/\D/g, ''), s]),
  );

  let updated = 0;
  let missing = 0;
  let same = 0;
  const missingList = [];

  for (const row of rows) {
    const st = byDni.get(row.dni);
    if (!st) {
      missing++;
      missingList.push(row);
      continue;
    }
    const current = String(st.telefono_contacto || '').replace(/\D/g, '');
    if (current === row.phone || current.endsWith(row.phone)) {
      same++;
      continue;
    }
    console.log(
      `UPDATE ${st.codigo_barras} ${st.nombre_completo}: "${st.telefono_contacto || ''}" → "${row.phone}"`,
    );
    if (dryRun) {
      updated++;
      continue;
    }
    const { error: upErr } = await sb
      .from('estudiantes')
      .update({ telefono_contacto: row.phone })
      .eq('id_estudiante', st.id_estudiante);
    if (upErr) {
      console.error('Error', row.dni, upErr.message);
      continue;
    }
    updated++;
  }

  console.log(`\n✅ Actualizados: ${updated}`);
  console.log(`Sin cambio (ya iguales): ${same}`);
  console.log(`No encontrados en BD: ${missing}`);
  if (missingList.length) {
    console.log(
      'Faltan:',
      missingList.map((m) => `${m.dni} ${m.nombre}`).join(' | '),
    );
  }
  if (dryRun) console.log('(dry-run: no se escribió)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
