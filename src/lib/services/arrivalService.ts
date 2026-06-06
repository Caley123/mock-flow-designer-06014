import { supabase } from '../supabaseClient';
import type { ArrivalRecord, RegistroLlegadaDB, Student, EducationalLevel, MonthlyAttendanceRow, AttendanceStatus } from '@/types';
import { configService } from './configService';
import { getLimaNow, getLimaTodayDate } from '@/lib/utils/limaDateTime';
import { getCached, setCached } from '@/lib/utils/memoryCache';

const ARRIVAL_LIMIT_CACHE_KEY = 'config:hora_limite_llegada';
const ARRIVAL_LIMIT_CACHE_TTL = 15 * 60 * 1000;

/**
 * Servicio para gestionar registros de llegada
 */

/**
 * Convierte un registro de llegada de DB a formato frontend
 */
function mapArrivalRecord(record: RegistroLlegadaDB & { 
  estudiante?: any;
  usuario?: any;
  usuario_salida?: any;
}): ArrivalRecord {
  // Formatear hora de salida si existe
  let departureTime = record.hora_salida || null;
  if (departureTime && departureTime.length > 5) {
    departureTime = departureTime.substring(0, 5);
  }

  return {
    id: record.id_registro,
    studentId: record.id_estudiante,
    student: record.estudiante ? {
      id: record.estudiante.id_estudiante,
      fullName: record.estudiante.nombre_completo,
      grade: record.estudiante.grado,
      section: record.estudiante.seccion,
      level: (record.estudiante.nivel_educativo || 'Secundaria') as EducationalLevel,
      barcode: record.estudiante.codigo_barras,
      profilePhoto: record.estudiante.foto_perfil,
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
    departureTime: departureTime,
    departureRegisteredBy: record.registrado_salida_por || null,
    departureType: (record.tipo_salida as 'Normal' | 'Autorizada' | 'Sin registro' | null) || null,
  };
}

/**
 * Obtiene la hora límite de llegada desde configuracion_sistema
 * Devuelve un string en formato HH:MM (24h). Valor por defecto: '08:00'
 */
async function getArrivalLimitTime(): Promise<string> {
  const cached = getCached<string>(ARRIVAL_LIMIT_CACHE_KEY);
  if (cached) return cached;

  const { config } = await configService.getByKey('hora_limite_llegada');
  const raw = config?.value?.trim() || '08:00';
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    setCached(ARRIVAL_LIMIT_CACHE_KEY, '08:00', ARRIVAL_LIMIT_CACHE_TTL);
    return '08:00';
  }
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  setCached(ARRIVAL_LIMIT_CACHE_KEY, normalized, ARRIVAL_LIMIT_CACHE_TTL);
  return normalized;
}

/** Precarga la hora límite (llamar al abrir el escáner del tutor) */
export async function prefetchArrivalConfig(): Promise<void> {
  await getArrivalLimitTime();
}

function getNowHHMM(): string {
  // Usar la hora actual en la zona horaria de Lima
  const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
  const [time] = now.split(' ')[1].split(':');
  const [hh, mm] = time.split(':');
  return `${hh}:${mm}`;
}

export type CreateArrivalOptions = {
  date?: string;
  arrivalTime?: string;
  status?: 'A tiempo' | 'Tarde';
};

/**
 * Registrar una llegada de estudiante
 */
export async function createArrivalRecord(
  studentId: number,
  registeredBy?: number,
  options?: CreateArrivalOptions
): Promise<{ record: ArrivalRecord | null; error: string | null }> {
  try {
    const { date: formattedDate, time: formattedTime } =
      options?.date && options?.arrivalTime
        ? { date: options.date, time: options.arrivalTime }
        : getLimaNow();

    const insertData: Record<string, unknown> = {
      id_estudiante: studentId,
      fecha: formattedDate,
      hora_llegada: formattedTime,
      fecha_creacion: new Date().toISOString(),
    };

    if (registeredBy) {
      insertData.registrado_por = registeredBy;
    }

    if (options?.status) {
      insertData.estado = options.status;
    } else {
      const limitHHMM = await getArrivalLimitTime();
      insertData.estado = formattedTime <= limitHHMM ? 'A tiempo' : 'Tarde';
    }

    const { data, error } = await supabase
      .from('registros_llegada')
      .insert(insertData)
      .select(`
        id_registro, id_estudiante, fecha, hora_llegada, estado, fecha_creacion, registrado_por
      `)
      .single();

    if (error) {
      console.error('Error al registrar llegada:', error);
      return { record: null, error: error.message };
    }

    const record: ArrivalRecord = {
      id: data.id_registro,
      studentId: data.id_estudiante,
      date: data.fecha,
      arrivalTime: data.hora_llegada,
      status: data.estado,
      registeredBy: data.registrado_por,
      createdAt: data.fecha_creacion,
    };

    return { record, error: null };
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
    // Nota: La relación usuario_salida se agregará después de ejecutar el script SQL
    // Por ahora, hacemos la consulta sin esa relación para evitar errores
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
      try {
        // Intentar parsear la fecha en diferentes formatos
        let formattedDate = filters.date;
        
        // Si la fecha viene en formato YYYY-MM-DD, usarla directamente
        if (/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
          formattedDate = filters.date;
        } 
        // Si viene en formato DD/MM/YYYY, convertir a YYYY-MM-DD
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(filters.date)) {
          const [dd, mm, yyyy] = filters.date.split('/');
          formattedDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
        // Si es una fecha ISO (de toISOString())
        else if (filters.date.includes('T')) {
          formattedDate = filters.date.split('T')[0];
        }
        
        query = query.eq('fecha', formattedDate);
      } catch (error) {
        console.error('Error al formatear la fecha:', error);
        // Si hay un error, intentar usar la fecha directamente
        query = query.eq('fecha', filters.date);
      }
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

    // Mapear los datos y formatear la hora correctamente
    const records = (data || []).map(record => {
      // Si la hora viene en formato HH:MM:SS, tomar solo HH:MM
      if (record.hora_llegada && record.hora_llegada.length > 5) {
        record.hora_llegada = record.hora_llegada.substring(0, 5);
      }
      return mapArrivalRecord(record);
    });
    return { records, error: null };
  } catch (error: any) {
    console.error('Error al obtener registros de llegada:', error);
    return { records: [], error: error.message };
  }
}

/**
 * Obtener reporte mensual de asistencia
 */
export async function getMonthlyAttendance(filters: {
  month: number; // 1-12
  year: number;
  level?: EducationalLevel;
  grade?: string;
  section?: string;
  bimestre?: number; // 1-4
  añoEscolar?: number;
}): Promise<{ rows: MonthlyAttendanceRow[]; daysInMonth: number; error: string | null }> {
  try {
    const startDate = new Date(Date.UTC(filters.year, filters.month - 1, 1));
    const endDate = new Date(Date.UTC(filters.year, filters.month, 0));
    const daysInMonth = endDate.getUTCDate();
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Obtener estudiantes del filtro
    let studentsQuery = supabase
      .from('estudiantes')
      .select('*')
      .eq('activo', true);

    if (filters.level) {
      studentsQuery = studentsQuery.eq('nivel_educativo', filters.level);
    }
    if (filters.grade) {
      studentsQuery = studentsQuery.eq('grado', filters.grade);
    }
    if (filters.section) {
      studentsQuery = studentsQuery.eq('seccion', filters.section);
    }

    const { data: studentsData, error: studentsError } = await studentsQuery.order('nombre_completo', { ascending: true });

    if (studentsError) {
      console.error('Error al obtener estudiantes para reporte mensual:', studentsError);
      return { rows: [], daysInMonth, error: studentsError.message };
    }

    const studentIds = (studentsData || []).map((st) => st.id_estudiante);
    if (studentIds.length === 0) {
      return { rows: [], daysInMonth, error: null };
    }

    const { data: arrivalsData, error: arrivalsError } = await supabase
      .from('registros_llegada')
      .select(`
        *,
        estudiante:estudiantes!registros_llegada_id_estudiante_fkey(*)
      `)
      .in('id_estudiante', studentIds)
      .gte('fecha', startStr)
      .lte('fecha', endStr);

    if (arrivalsError) {
      console.error('Error al obtener registros mensuales de llegada:', arrivalsError);
      return { rows: [], daysInMonth, error: arrivalsError.message };
    }

    const recordsMap = new Map<number, Map<number, ArrivalRecord>>();
    (arrivalsData || []).forEach((record) => {
      const mapped = mapArrivalRecord(record);
      const dateObj = new Date(mapped.date);
      const day = dateObj.getUTCDate();
      if (!recordsMap.has(mapped.studentId)) {
        recordsMap.set(mapped.studentId, new Map());
      }
      recordsMap.get(mapped.studentId)!.set(day, mapped);
    });

    const convertStatus = (status?: string): AttendanceStatus => {
      if (!status) return 'Sin_registro';
      if (status === 'A tiempo') return 'A_tiempo';
      if (status === 'Tarde') return 'Tarde';
      if (status === 'Justificada') return 'Justificada';
      if (status === 'Injustificada') return 'Injustificada';
      return 'Sin_registro';
    };

    const rows: MonthlyAttendanceRow[] = (studentsData || []).map((student) => {
      const dayStatusMap = recordsMap.get(student.id_estudiante) || new Map();
      let onTime = 0;
      let late = 0;
      let justified = 0;
      let unjustified = 0;

      const days = Array.from({ length: daysInMonth }, (_, idx) => {
        const day = idx + 1;
        const record = dayStatusMap.get(day);
        const status = convertStatus(record?.status);
        switch (status) {
          case 'A_tiempo':
            onTime += 1;
            break;
          case 'Tarde':
            late += 1;
            break;
          case 'Justificada':
            justified += 1;
            break;
          case 'Injustificada':
            unjustified += 1;
            break;
        }
        return {
          day,
          status,
          arrivalTime: record?.arrivalTime,
        };
      });

      return {
        student: {
          id: student.id_estudiante,
          fullName: student.nombre_completo,
          grade: student.grado,
          section: student.seccion,
          level: student.nivel_educativo,
          barcode: student.codigo_barras,
          profilePhoto: student.foto_perfil,
          active: student.activo,
        },
        days,
        totals: {
          onTime,
          late,
          justified,
          unjustified,
        },
      };
    });

    return { rows, daysInMonth, error: null };
  } catch (error: any) {
    console.error('Error en getMonthlyAttendance:', error);
    return { rows: [], daysInMonth: 0, error: error.message || 'Error al generar reporte mensual' };
  }
}

/**
 * Obtener estadísticas de llegadas del día
 */
/**
 * Obtener reporte bimestral de asistencia
 */
export async function getBimestralAttendance(filters: {
  bimestre: number; // 1-4
  añoEscolar: number;
  level?: EducationalLevel;
  grade?: string;
  section?: string;
}): Promise<{ rows: MonthlyAttendanceRow[]; daysInBimestre: number; error: string | null }> {
  try {
    // Importar utilidades de bimestres
    const { getBimestreDates } = await import('@/lib/utils/bimestreUtils');
    const { inicio, fin } = getBimestreDates(filters.bimestre as 1 | 2 | 3 | 4, filters.añoEscolar);
    
    const startStr = inicio.toISOString().split('T')[0];
    const endStr = fin.toISOString().split('T')[0];
    
    // Calcular días totales en el bimestre
    const daysInBimestre = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Obtener estudiantes del filtro
    let studentsQuery = supabase
      .from('estudiantes')
      .select('*')
      .eq('activo', true);

    if (filters.level) {
      studentsQuery = studentsQuery.eq('nivel_educativo', filters.level);
    }
    if (filters.grade) {
      studentsQuery = studentsQuery.eq('grado', filters.grade);
    }
    if (filters.section) {
      studentsQuery = studentsQuery.eq('seccion', filters.section);
    }

    const { data: studentsData, error: studentsError } = await studentsQuery.order('nombre_completo', { ascending: true });

    if (studentsError) {
      console.error('Error al obtener estudiantes para reporte bimestral:', studentsError);
      return { rows: [], daysInBimestre, error: studentsError.message };
    }

    const studentIds = (studentsData || []).map((st) => st.id_estudiante);
    if (studentIds.length === 0) {
      return { rows: [], daysInBimestre, error: null };
    }

    const { data: arrivalsData, error: arrivalsError } = await supabase
      .from('registros_llegada')
      .select(`
        *,
        estudiante:estudiantes!registros_llegada_id_estudiante_fkey(*)
      `)
      .in('id_estudiante', studentIds)
      .gte('fecha', startStr)
      .lte('fecha', endStr);

    if (arrivalsError) {
      console.error('Error al obtener registros bimestrales de llegada:', arrivalsError);
      return { rows: [], daysInBimestre, error: arrivalsError.message };
    }

    const recordsMap = new Map<number, Map<string, ArrivalRecord>>();
    (arrivalsData || []).forEach((record) => {
      const mapped = mapArrivalRecord(record);
      const dateKey = mapped.date;
      if (!recordsMap.has(mapped.studentId)) {
        recordsMap.set(mapped.studentId, new Map());
      }
      recordsMap.get(mapped.studentId)!.set(dateKey, mapped);
    });

    const convertStatus = (status?: string): AttendanceStatus => {
      if (!status) return 'Sin_registro';
      if (status === 'A tiempo') return 'A_tiempo';
      if (status === 'Tarde') return 'Tarde';
      if (status === 'Justificada') return 'Justificada';
      if (status === 'Injustificada') return 'Injustificada';
      return 'Sin_registro';
    };

    // Crear array de todas las fechas del bimestre
    const allDates: string[] = [];
    const currentDate = new Date(inicio);
    while (currentDate <= fin) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const rows: MonthlyAttendanceRow[] = (studentsData || []).map((student) => {
      const dayStatusMap = recordsMap.get(student.id_estudiante) || new Map();
      let onTime = 0;
      let late = 0;
      let justified = 0;
      let unjustified = 0;

      const days = allDates.map((dateStr, idx) => {
        const record = dayStatusMap.get(dateStr);
        const status = convertStatus(record?.status);
        const dateObj = new Date(dateStr);
        const day = dateObj.getDate();
        
        switch (status) {
          case 'A_tiempo':
            onTime += 1;
            break;
          case 'Tarde':
            late += 1;
            break;
          case 'Justificada':
            justified += 1;
            break;
          case 'Injustificada':
            unjustified += 1;
            break;
        }
        return {
          day,
          status,
          arrivalTime: record?.arrivalTime,
        };
      });

      return {
        student: {
          id: student.id_estudiante,
          fullName: student.nombre_completo,
          grade: student.grado,
          section: student.seccion,
          level: student.nivel_educativo,
          barcode: student.codigo_barras,
          profilePhoto: student.foto_perfil,
          active: student.activo,
        },
        days,
        totals: {
          onTime,
          late,
          justified,
          unjustified,
        },
      };
    });

    return { rows, daysInBimestre, error: null };
  } catch (error: any) {
    console.error('Error en getBimestralAttendance:', error);
    return { rows: [], daysInBimestre: 0, error: error.message || 'Error al generar reporte bimestral' };
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
    // Obtener la fecha actual en la zona horaria de Lima
    const todayLima = new Date().toLocaleString('es-PE', { 
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [dd, mm, yyyy] = todayLima.split('/');
    const today = `${yyyy}-${mm}-${dd}`;

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

/**
 * Registrar salida de estudiante
 */
export async function createDepartureRecord(
  registroId: number,
  registeredBy?: number,
  tipoSalida: 'Normal' | 'Autorizada' = 'Normal'
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Obtener la hora actual en la zona horaria de Lima
    const now = new Date();
    const hours = now.toLocaleString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', hour12: false });
    const minutes = now.toLocaleString('es-PE', { timeZone: 'America/Lima', minute: '2-digit' });
    const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

    const updateData: any = {
      hora_salida: formattedTime,
      fecha_salida: new Date().toISOString(),
      tipo_salida: tipoSalida,
    };

    if (registeredBy) {
      updateData.registrado_salida_por = registeredBy;
    }

    const { error } = await supabase
      .from('registros_llegada')
      .update(updateData)
      .eq('id_registro', registroId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error en createDepartureRecord:', error);
    return { success: false, error: error.message || 'Error al registrar salida' };
  }
}

/**
 * Obtener estudiantes sin salida registrada para una fecha específica
 */
export async function getStudentsWithoutDeparture(date: string): Promise<{
  records: ArrivalRecord[];
  error: string | null;
}> {
  try {
    const { records, error } = await getArrivals({ date });
    
    if (error) {
      return { records: [], error };
    }

    // Filtrar registros que no tienen hora_salida
    const withoutDeparture = records.filter(record => !record.departureTime);
    
    return { records: withoutDeparture, error: null };
  } catch (error: any) {
    console.error('Error en getStudentsWithoutDeparture:', error);
    return { records: [], error: error.message || 'Error al obtener estudiantes sin salida' };
  }
}

/**
 * Obtener alertas de estudiantes sin salida registrada
 * Retorna estudiantes que llegaron pero no tienen salida registrada después de la hora límite
 */
export async function getDepartureAlerts(date?: string, horaLimite?: string): Promise<{
  alerts: Array<{
    record: ArrivalRecord;
    hoursSinceArrival: number;
    isCritical: boolean;
  }>;
  error: string | null;
}> {
  try {
    // Usar fecha actual si no se especifica
    const targetDate = date || getTodayDate();
    
    // Obtener hora límite desde configuración o usar 15:00 por defecto
    let limitHour = horaLimite || '15:00';
    if (!horaLimite) {
      const { config } = await configService.getByKey('hora_limite_salida');
      limitHour = config?.value?.trim() || '15:00';
    }

    const { records, error } = await getStudentsWithoutDeparture(targetDate);
    
    if (error) {
      return { alerts: [], error };
    }

    // Filtrar solo los que ya pasaron la hora límite
    const now = new Date();
    const [limitH, limitM] = limitHour.split(':').map(Number);
    const limitTime = new Date();
    limitTime.setHours(limitH, limitM, 0, 0);

    const alerts = records
      .map(record => {
        // Calcular horas desde la llegada
        const [arrivalH, arrivalM] = record.arrivalTime.split(':').map(Number);
        const arrivalTime = new Date();
        arrivalTime.setHours(arrivalH, arrivalM, 0, 0);
        
        const hoursSinceArrival = (now.getTime() - arrivalTime.getTime()) / (1000 * 60 * 60);
        
        // Es crítico si ya pasó la hora límite
        const isCritical = now > limitTime;
        
        return {
          record,
          hoursSinceArrival: Math.max(0, hoursSinceArrival),
          isCritical,
        };
      })
      .filter(alert => alert.isCritical || alert.hoursSinceArrival > 2); // Mostrar si es crítico o han pasado más de 2 horas
    
    return { alerts, error: null };
  } catch (error: any) {
    console.error('Error en getDepartureAlerts:', error);
    return { alerts: [], error: error.message || 'Error al obtener alertas de salida' };
  }
}

function getTodayDate(): string {
  return getLimaTodayDate();
}

export const arrivalService = {
  createArrivalRecord,
  getArrivals,
  getMonthlyAttendance,
  getBimestralAttendance,
  getTodayStats,
  createDepartureRecord,
  getStudentsWithoutDeparture,
  getDepartureAlerts,
  prefetchArrivalConfig,
};
