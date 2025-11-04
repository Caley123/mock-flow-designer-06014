import { supabase } from '../supabaseClient';
import type { ArrivalRecord, RegistroLlegadaDB, Student } from '@/types';
import { configService } from './configService';

/**
 * Servicio para gestionar registros de llegada
 */

/**
 * Convierte un registro de llegada de DB a formato frontend
 */
function mapArrivalRecord(record: RegistroLlegadaDB & { 
  estudiante?: any;
  usuario?: any;
}): ArrivalRecord {
  return {
    id: record.id_registro,
    studentId: record.id_estudiante,
    student: record.estudiante ? {
      id: record.estudiante.id_estudiante,
      fullName: record.estudiante.nombre_completo,
      grade: record.estudiante.grado,
      section: record.estudiante.seccion,
      barcode: record.estudiante.codigo_barras,
      photo: record.estudiante.foto_perfil,
      active: record.estudiante.activo,
    } : undefined,
    date: record.fecha,
    arrivalTime: record.hora_llegada,
    status: record.estado,
    registeredBy: record.registrado_por,
    registeredByUser: record.usuario ? {
      id: record.usuario.id_usuario,
      username: record.usuario.username,
      fullName: record.usuario.nombre_completo,
      email: record.usuario.email,
      role: record.usuario.rol,
      active: record.usuario.activo,
    } : undefined,
    createdAt: record.fecha_creacion,
  };
}

/**
 * Obtiene la hora límite de llegada desde configuracion_sistema
 * Devuelve un string en formato HH:MM (24h). Valor por defecto: '08:00'
 */
async function getArrivalLimitTime(): Promise<string> {
  const { config } = await configService.getByKey('hora_limite_llegada');
  const raw = config?.value?.trim() || '08:00';
  // Normalizar a HH:MM
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '08:00';
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getNowHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Registrar una llegada de estudiante
 */
export async function createArrivalRecord(
  studentId: number,
  registeredBy?: number
): Promise<{ record: ArrivalRecord | null; error: string | null }> {
  try {
    const insertData: any = {
      id_estudiante: studentId,
    };

    if (registeredBy) {
      insertData.registrado_por = registeredBy;
    }

    // Calcular estado en base a hora_limite_llegada de configuracion_sistema
    const [limitHHMM, nowHHMM] = await Promise.all([
      getArrivalLimitTime(),
      Promise.resolve(getNowHHMM()),
    ]);
    insertData.estado = nowHHMM <= limitHHMM ? 'A tiempo' : 'Tarde';

    const { data, error } = await supabase
      .from('registros_llegada')
      .insert(insertData)
      .select(`
        *,
        estudiante:estudiantes!registros_llegada_id_estudiante_fkey(*),
        usuario:usuarios!registros_llegada_registrado_por_fkey(*)
      `)
      .single();

    if (error) {
      console.error('Error al registrar llegada:', error);
      return { record: null, error: error.message };
    }

    return { record: mapArrivalRecord(data), error: null };
  } catch (error: any) {
    console.error('Error al registrar llegada:', error);
    return { record: null, error: error.message };
  }
}

/**
 * Obtener registros de llegada con filtros
 */
export async function getArrivals(filters?: {
  date?: string;
  studentId?: number;
  status?: 'A tiempo' | 'Tarde';
  limit?: number;
}): Promise<{ records: ArrivalRecord[]; error: string | null }> {
  try {
    let query = supabase
      .from('registros_llegada')
      .select(`
        *,
        estudiante:estudiantes!registros_llegada_id_estudiante_fkey(*),
        usuario:usuarios!registros_llegada_registrado_por_fkey(*)
      `)
      .order('fecha', { ascending: false })
      .order('hora_llegada', { ascending: false });

    if (filters?.date) {
      query = query.eq('fecha', filters.date);
    }

    if (filters?.studentId) {
      query = query.eq('id_estudiante', filters.studentId);
    }

    if (filters?.status) {
      query = query.eq('estado', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener registros de llegada:', error);
      return { records: [], error: error.message };
    }

    const records = (data || []).map(mapArrivalRecord);
    return { records, error: null };
  } catch (error: any) {
    console.error('Error al obtener registros de llegada:', error);
    return { records: [], error: error.message };
  }
}

/**
 * Obtener estadísticas de llegadas del día
 */
export async function getTodayStats(): Promise<{
  stats: {
    total: number;
    onTime: number;
    late: number;
  } | null;
  error: string | null;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('registros_llegada')
      .select('estado')
      .eq('fecha', today);

    if (error) {
      console.error('Error al obtener estadísticas:', error);
      return { stats: null, error: error.message };
    }

    const stats = {
      total: data.length,
      onTime: data.filter((r) => r.estado === 'A tiempo').length,
      late: data.filter((r) => r.estado === 'Tarde').length,
    };

    return { stats, error: null };
  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);
    return { stats: null, error: error.message };
  }
}

export const arrivalService = {
  createArrivalRecord,
  getArrivals,
  getTodayStats,
};
