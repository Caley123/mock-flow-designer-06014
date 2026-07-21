/**
 * Importa SEC 1A.xls (SieWeb Jean Piaget) → estudiantes en Supabase JP.
 * NGS S1A = Secundaria / 1ro / A
 */
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const URL = process.env.JP_SUPABASE_URL || 'https://kelylvvoebneugnajiwv.supabase.co';
const KEY =
  process.env.JP_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

const file = process.argv[2] || String.raw`c:\Users\User\Downloads\SEC 1A.xls`;
const dryRun = process.argv.includes('--dry-run');

function parseNgs(ngs) {
  const s = String(ngs || '').trim().toUpperCase();
  // S1A, S2B, P3A...
  const m = s.match(/^([SP])(\d)([A-Z])$/);
  if (!m) return null;
  const nivel = m[1] === 'S' ? 'Secundaria' : 'Primaria';
  const n = m[2];
  const gradoMap = { 1: '1ro', 2: '2do', 3: '3ro', 4: '4to', 5: '5to', 6: '6to' };
  return { nivel, grado: gradoMap[n] || `${n}`, seccion: m[3] };
}

function readStudents(path) {
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

  // Buscar fila de encabezados
  let headerRow = -1;
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i].map((c) => String(c).trim().toUpperCase());
    if (row.includes('N°') || row.includes('Nº') || row.includes('APELLIDOS Y NOMBRES')) {
      if (row.some((c) => c.includes('APELLIDOS'))) {
        headerRow = i;
        break;
      }
    }
  }
  if (headerRow < 0) throw new Error('No se encontró fila de encabezados');

  const headers = matrix[headerRow].map((c) => String(c).trim());
  const idx = (name) => headers.findIndex((h) => h.toUpperCase().includes(name));

  const iNombre = idx('APELLIDOS');
  const iNgs = idx('NGS');
  const iDoc = headers.findIndex((h) => /NRO\.?\s*DOC/i.test(h) || h === 'NRO. DOC.');
  const iEstado = idx('ESTADO');
  const iCod = idx('COD. ALU');

  const out = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = matrix[r];
    const nombre = String(row[iNombre] || '').trim();
    const dni = String(row[iDoc] || '').replace(/\D/g, '');
    const ngs = String(row[iNgs] || '').trim();
    const estado = String(row[iEstado] || '').trim().toLowerCase();
    if (!nombre || !dni) continue;
    if (estado && !estado.includes('vigente')) continue;

    const parsed = parseNgs(ngs) || { nivel: 'Secundaria', grado: '1ro', seccion: 'A' };
    out.push({
      codigo_barras: dni,
      nombre_completo: nombre,
      grado: parsed.grado,
      seccion: parsed.seccion,
      nivel_educativo: parsed.nivel,
      activo: true,
      _cod_alu: String(row[iCod] || '').trim(),
      _ngs: ngs,
    });
  }
  return out;
}

async function main() {
  if (!KEY) {
    console.error('Falta JP_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const students = readStudents(file);
  console.log(`Archivo: ${file}`);
  console.log(`Alumnos parseados: ${students.length}`);
  console.log('Muestra:', JSON.stringify(students.slice(0, 3), null, 2));

  const sb = createClient(URL, KEY, { auth: { persistSession: false } });

  const { data: existing, error: e1 } = await sb
    .from('estudiantes')
    .select('codigo_barras');
  if (e1) throw e1;

  const have = new Set((existing || []).map((r) => String(r.codigo_barras || '').trim()));
  const toInsert = students
    .filter((s) => !have.has(s.codigo_barras))
    .map(({ _cod_alu, _ngs, ...rest }) => rest);

  console.log(`Ya en BD: ${have.size}`);
  console.log(`Nuevos a insertar: ${toInsert.length}`);
  console.log(`Duplicados omitidos: ${students.length - toInsert.length}`);

  if (dryRun) {
    console.log('--dry-run: no se insertó nada');
    return;
  }

  if (!toInsert.length) {
    console.log('Nada que insertar');
    return;
  }

  const { data, error } = await sb.from('estudiantes').insert(toInsert).select('id_estudiante, codigo_barras, nombre_completo');
  if (error) {
    console.error('Error insert:', error.message, error);
    process.exit(1);
  }
  console.log(`✅ Insertados: ${data?.length ?? toInsert.length}`);
  console.log(data?.slice(0, 5));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
