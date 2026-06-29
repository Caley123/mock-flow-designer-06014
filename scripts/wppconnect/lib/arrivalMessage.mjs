/**
 * Plantilla de llegada con variación (spintax) para reducir hash idéntico.
 */

const GREETINGS = [
  'Hola,',
  'Buen día,',
  'Buenos días,',
  'Estimado apoderado,',
  'Estimada familia,',
  'Saludos,',
  'Cordial saludo,',
];

const CLOSINGS = [
  '_Notificación automática del sistema de asistencia escolar._',
  '_Mensaje automático del SIE — I.E. San Ramón._',
  '_Sistema de asistencia escolar — I.E. San Ramón._',
  '_Asiscole — control de asistencia I.E. San Ramón._',
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Hora con segundos para variar el hash del mensaje. */
export function formatHoraWithSeconds(arrivalTime) {
  const t = String(arrivalTime || '').trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t.slice(0, 8);
  if (/^\d{2}:\d{2}$/.test(t)) {
    const sec = String(new Date().getSeconds()).padStart(2, '0');
    return `${t}:${sec}`;
  }
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatFecha(dateStr) {
  const datePart = String(dateStr || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
  }
  return datePart || '—';
}

function academicLines(student) {
  const lines = [];
  if (student.level) lines.push(`*Nivel:* ${student.level}`);
  if (student.grade) lines.push(`*Grado:* ${student.grade}`);
  if (student.section) lines.push(`*Sección:* ${student.section}`);
  return lines;
}

function attendanceLink(student, record, appUrl) {
  const base = String(appUrl || '').replace(/\/$/, '');
  if (!base) return null;
  const dni = student.barcode?.trim();
  if (dni) return `${base}/llegada/dni/${encodeURIComponent(dni)}`;
  if (record.id) return `${base}/llegada/${record.id}`;
  return null;
}

/**
 * @param {{ fullName: string, level?: string, grade?: string, section?: string, barcode?: string }} student
 * @param {{ date?: string, arrivalTime?: string, status?: string, id?: number }} record
 * @param {string} [appUrl]
 */
export function buildArrivalMessage(student, record, appUrl) {
  const greeting = pickRandom(GREETINGS);
  const closing = pickRandom(CLOSINGS);
  const fecha = formatFecha(record.date);
  const hora = formatHoraWithSeconds(record.arrivalTime);
  const attLink = attendanceLink(student, record, appUrl);
  const portalLink = appUrl ? `${String(appUrl).replace(/\/$/, '')}/portal-padres` : null;

  return [
    greeting,
    '',
    '🏫 *Registro de llegada — I.E. San Ramón*',
    '',
    `*Estudiante:* ${student.fullName}`,
    ...academicLines(student),
    `*Fecha:* ${fecha}`,
    `*Hora:* ${hora}`,
    `*Estado:* ${record.status || 'Registrado'}`,
    '',
    attLink ? `📋 *Ver asistencia de hoy:*\n${attLink}` : '',
    portalLink ? `👨‍👩‍👧 *Portal de padres:*\n${portalLink}` : '',
    '',
    closing,
  ]
    .filter((l) => l !== null && l !== undefined && l !== '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
