const LIMA_TZ = 'America/Lima';

const limaPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIMA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Fecha y hora actual en Lima (una sola llamada Intl, más rápido que múltiples toLocaleString) */
export function getLimaNow(): { date: string; time: string } {
  const parts = limaPartsFormatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

export function getLimaTodayDate(): string {
  return getLimaNow().date;
}

/** Clave YYYY-MM-DD de un Date en zona Lima */
export function formatDateKeyLima(date: Date): string {
  const parts = limaPartsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** ¿Mismo día calendario en Lima? */
export function isSameCalendarDayLima(a: Date, b: Date): boolean {
  return formatDateKeyLima(a) === formatDateKeyLima(b);
}

/** Normaliza hora DB (HH:mm o HH:mm:ss) a HH:mm */
export function normalizeTimeHHMM(hora: string): string {
  const trimmed = hora.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '08:00';
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Parsea fecha + hora de cita para el calendario (duración por defecto 30 min) */
export function parseMeetingDateTime(
  fecha: string,
  hora: string,
  durationMinutes = 30
): { start: Date; end: Date } {
  const dateKey = fecha.trim().slice(0, 10);
  const timeKey = normalizeTimeHHMM(hora);
  const start = new Date(`${dateKey}T${timeKey}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

/** Rango ISO para filtrar timestamps de un día (input type=date YYYY-MM-DD) */
export function getLimaDayRangeISO(dateKey: string): { desde: string; hasta: string } {
  const key = dateKey.trim().slice(0, 10);
  return {
    desde: `${key}T00:00:00.000-05:00`,
    hasta: `${key}T23:59:59.999-05:00`,
  };
}
