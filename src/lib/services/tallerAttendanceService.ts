import { supabase } from '../supabaseClient';
import type { TallerAsistencia } from '@/types';
import { resolveTallerArrivalStatus } from '@/lib/utils/tallerArrivalStatus';
import {
  getLimaNow,
  getLimaTodayDate,
  getLimaMonthBounds,
  getMonthBounds,
} from '@/lib/utils/limaDateTime';

type TallerAsistenciaRow = {
  id_registro: number;
  taller_id: string;
  id_estudiante: number;
  fecha: string;
  hora_llegada: string | null;
  hora_salida: string | null;
  estado: string | null;
  tipo_salida: string | null;
  registrado_por: number | null;
  talleres?: { nombre: string } | { nombre: string }[] | null;
};

const ASISTENCIA_SELECT =
  'id_registro, taller_id, id_estudiante, fecha, hora_llegada, hora_salida, estado, tipo_salida, registrado_por';

function truncateTimeHHmm(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 5 ? trimmed.substring(0, 5) : trimmed;
}

function resolveTallerNombre(
  talleres: TallerAsistenciaRow['talleres'],
): string | undefined {
  if (!talleres) return undefined;
  if (Array.isArray(talleres)) return talleres[0]?.nombre;
  return talleres.nombre;
}

export function mapTallerAsistenciaRow(row: TallerAsistenciaRow): TallerAsistencia {
  return {
    id: row.id_registro,
    tallerId: row.taller_id,
    tallerNombre: resolveTallerNombre(row.talleres),
    studentId: row.id_estudiante,
    date: row.fecha,
    arrivalTime: truncateTimeHHmm(row.hora_llegada),
    departureTime: truncateTimeHHmm(row.hora_salida),
    arrivalStatus: (row.estado as TallerAsistencia['arrivalStatus']) ?? null,
    departureType: (row.tipo_salida as TallerAsistencia['departureType']) ?? null,
    registeredBy: row.registrado_por,
  };
}

export type RecordTallerArrivalOptions = {
  date?: string;
  arrivalTime?: string;
  /** Si el caller ya tiene la hora de inicio del taller, evita una consulta extra. */
  tallerHoraInicio?: string | null;
};

export async function recordArrival(
  tallerId: string,
  studentId: number,
  registeredBy?: number,
  options?: RecordTallerArrivalOptions,
): Promise<{ record: TallerAsistencia | null; error: string | null }> {
  try {
    const fecha = options?.date ?? getLimaTodayDate();
    const hora = options?.arrivalTime ?? getLimaNow().time;

    let tallerHoraInicio = options?.tallerHoraInicio ?? null;
    if (tallerHoraInicio === undefined) {
      const { data: tallerRow, error: tallerError } = await supabase
        .from('talleres')
        .select('hora_inicio')
        .eq('id', tallerId)
        .maybeSingle();

      if (tallerError) {
        return { record: null, error: tallerError.message };
      }

      tallerHoraInicio = tallerRow?.hora_inicio ?? null;
    }

    const estado = resolveTallerArrivalStatus(hora, tallerHoraInicio);

    const payload: Record<string, unknown> = {
      taller_id: tallerId,
      id_estudiante: studentId,
      fecha,
      hora_llegada: hora,
      estado,
    };

    if (registeredBy != null) {
      payload.registrado_por = registeredBy;
    }

    const { data, error } = await supabase
      .from('taller_asistencias')
      .upsert(payload, { onConflict: 'taller_id,id_estudiante,fecha' })
      .select(ASISTENCIA_SELECT)
      .single();

    if (error) {
      console.error('Error al registrar llegada de taller:', error);
      return { record: null, error: error.message };
    }

    return { record: mapTallerAsistenciaRow(data as TallerAsistenciaRow), error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al registrar llegada de taller';
    console.error('Error en recordArrival:', error);
    return { record: null, error: message };
  }
}

export async function recordDeparture(
  tallerId: string,
  studentId: number,
  registeredBy?: number,
  tipoSalida: 'Normal' | 'Autorizada' = 'Normal',
  date?: string,
): Promise<{
  success: boolean;
  error: string | null;
  departureTime: string | null;
}> {
  try {
    const fecha = date ?? getLimaTodayDate();
    const departureTime = getLimaNow().time;

    const updateData: Record<string, unknown> = {
      hora_salida: departureTime,
      tipo_salida: tipoSalida,
    };

    if (registeredBy != null) {
      updateData.registrado_por = registeredBy;
    }

    const { data, error } = await supabase
      .from('taller_asistencias')
      .update(updateData)
      .eq('taller_id', tallerId)
      .eq('id_estudiante', studentId)
      .eq('fecha', fecha)
      .is('hora_salida', null)
      .select('id_registro')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message, departureTime: null };
    }

    if (!data) {
      return {
        success: false,
        error: 'No hay llegada registrada o la salida ya fue registrada.',
        departureTime: null,
      };
    }

    return { success: true, error: null, departureTime };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al registrar salida de taller';
    console.error('Error en recordDeparture:', error);
    return { success: false, error: message, departureTime: null };
  }
}

export async function fetchMonthForStudent(
  studentId: number,
  year?: number,
  month?: number,
): Promise<{ records: TallerAsistencia[]; error: string | null }> {
  try {
    const bounds =
      year != null && month != null ? getMonthBounds(year, month) : getLimaMonthBounds();
    const { start, end } = bounds;

    const { data, error } = await supabase
      .from('taller_asistencias')
      .select(`${ASISTENCIA_SELECT}, talleres(nombre)`)
      .eq('id_estudiante', studentId)
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: false });

    if (error) {
      console.warn('fetchMonthForStudent:', error.message);
      return { records: [], error: error.message };
    }

    return {
      records: (data || []).map((row) => mapTallerAsistenciaRow(row as TallerAsistenciaRow)),
      error: null,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al cargar asistencias de taller';
    console.error('Error en fetchMonthForStudent:', error);
    return { records: [], error: message };
  }
}

export const tallerAttendanceService = {
  recordArrival,
  recordDeparture,
  fetchMonthForStudent,
  mapTallerAsistenciaRow,
};
