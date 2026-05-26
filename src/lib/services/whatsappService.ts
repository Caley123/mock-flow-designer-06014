import type { ArrivalRecord, Student } from '@/types';
import { toWhatsAppChatId } from '@/lib/utils/phoneUtils';

/** OpenWA — https://github.com/rmyndharis/OpenWA */
const WHATSAPP_ENABLED =
  import.meta.env.VITE_OPENWA_ENABLED === 'true' ||
  import.meta.env.VITE_WHATSAPP_ENABLED === 'true' ||
  import.meta.env.VITE_WAHA_ENABLED === 'true';

const OPENWA_API_URL = (
  import.meta.env.VITE_OPENWA_API_URL ||
  import.meta.env.VITE_OPENWA_BASE_URL ||
  '/api/openwa'
).replace(/\/$/, '');

const OPENWA_SESSION_ID = import.meta.env.VITE_OPENWA_SESSION_ID || '';
const OPENWA_API_KEY = import.meta.env.VITE_OPENWA_API_KEY || '';

function buildArrivalMessage(student: Student, record: ArrivalRecord): string {
  const datePart = record.date?.slice(0, 10) || '';
  let fecha = datePart;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-');
    fecha = `${d}/${m}/${y}`;
  }
  const hora = (record.arrivalTime || '').slice(0, 5) || '—:—';
  const nivel = [student.level, student.grade, student.section].filter(Boolean).join(' · ');

  return [
    '*Registro de llegada — SIE*',
    '',
    `*Estudiante:* ${student.fullName}`,
    nivel ? `*Curso:* ${nivel}` : '',
    `*Fecha:* ${fecha}`,
    `*Hora:* ${hora}`,
    `*Estado:* ${record.status || 'Registrado'}`,
    '',
    '_Notificación automática del sistema de asistencia escolar._',
  ]
    .filter(Boolean)
    .join('\n');
}

function openwaHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (OPENWA_API_KEY) {
    headers['X-API-Key'] = OPENWA_API_KEY;
  }
  return headers;
}

function friendlyOpenwaError(detail: string, status?: number): string {
  const lower = detail.toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('unauthorized') ||
    lower.includes('api key')
  ) {
    return 'API Key de OpenWA inválida. Configúrela en el dashboard (http://localhost:2886) y en VITE_OPENWA_API_KEY.';
  }
  if (status === 404 || lower.includes('session')) {
    return 'Sesión de OpenWA no encontrada. Revise VITE_OPENWA_SESSION_ID en .env.local.';
  }
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    lower.includes('econnrefused') ||
    lower.includes('proxy error') ||
    lower.includes('internal server error')
  ) {
    return 'OpenWA no está activo. Sin Docker: clone OpenWA, ejecute npm install y npm run dev (API :2785). Ver OPENWA_WHATSAPP.md o scripts/iniciar-openwa.ps1';
  }
  if (detail.length > 220) {
    return 'Error de OpenWA al enviar el mensaje';
  }
  return detail || 'Error de OpenWA al enviar el mensaje';
}

async function sendText(chatId: string, text: string): Promise<{ ok: boolean; error: string | null }> {
  if (!WHATSAPP_ENABLED) {
    return { ok: false, error: 'WhatsApp desactivado (VITE_OPENWA_ENABLED)' };
  }

  if (!OPENWA_SESSION_ID.trim()) {
    return {
      ok: false,
      error: 'Falta VITE_OPENWA_SESSION_ID (cree una sesión en el dashboard OpenWA)',
    };
  }

  if (!OPENWA_API_KEY.trim()) {
    return {
      ok: false,
      error: 'Falta VITE_OPENWA_API_KEY (cópiela desde el dashboard OpenWA)',
    };
  }

  try {
    const url = `${OPENWA_API_URL}/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/messages/send-text`;

    const response = await fetch(url, {
      method: 'POST',
      headers: openwaHeaders(),
      body: JSON.stringify({ chatId, text }),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => response.statusText);
      return { ok: false, error: friendlyOpenwaError(raw, response.status) };
    }

    return { ok: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo conectar con OpenWA';
    return { ok: false, error: friendlyOpenwaError(message) };
  }
}

/**
 * Envía WhatsApp al apoderado tras registrar llegada.
 * No lanza excepción: el escaneo no debe fallar si OpenWA no responde.
 */
export async function notifyParentArrival(
  student: Student,
  record: ArrivalRecord
): Promise<{ ok: boolean; error: string | null; chatId?: string }> {
  const phone = student.contactPhone?.trim() || student.emergencyPhone?.trim() || '';
  if (!phone) {
    return { ok: false, error: 'El estudiante no tiene teléfono de contacto' };
  }

  const chatId = toWhatsAppChatId(phone);
  if (!chatId) {
    return { ok: false, error: 'Teléfono de contacto no válido para WhatsApp' };
  }

  const text = buildArrivalMessage(student, record);
  const result = await sendText(chatId, text);
  return { ...result, chatId };
}

export const whatsappService = {
  isEnabled: () => WHATSAPP_ENABLED,
  notifyParentArrival,
};
