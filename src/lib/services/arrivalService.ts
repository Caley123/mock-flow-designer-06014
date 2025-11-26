import { supabase } from '../supabaseClient';
import type { ArrivalRecord, RegistroLlegadaDB, Student, EducationalLevel, MonthlyAttendanceRow, AttendanceStatus } from '@/types';
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
  // Usar la hora actual en la zona horaria de Lima
  const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
  const [time] = now.split(' ')[1].split(':');
  const [hh, mm] = time.split(':');
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
    // Obtener la fecha y hora actual en la zona horaria de Lima
    const now = new Date();
    
    // Formatear la fecha de manera directa usando toISOString y ajustando la zona horaria
    const year = now.toLocaleString('es-PE', { timeZone: 'America/Lima', year: 'numeric' });
    const month = now.toLocaleString('es-PE', { timeZone: 'America/Lima', month: '2-digit' });
    const day = now.toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit' });
    const hours = now.toLocaleString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', hour12: false });
    const minutes = now.toLocaleString('es-PE', { timeZone: 'America/Lima', minute: '2-digit' });
    
    // Asegurarse de que los valores de un solo dígito tengan un 0 al inicio
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    
    console.log('Fecha y hora procesadas:', {
      formattedDate,
      formattedTime,
      timeZone: 'America/Lima'
    });

    const insertData: any = {
      id_estudiante: studentId,
      fecha: formattedDate,
      hora_llegada: formattedTime,
      fecha_creacion: new Date().toISOString() // Guardar en UTC
    };

    if (registeredBy) {
      insertData.registrado_por = registeredBy;
    }

    // Calcular estado en base a hora_limite_llegada de configuracion_sistema
    const limitHHMM = await getArrivalLimitTime();
    insertData.estado = formattedTime <= limitHHMM ? 'A tiempo' : 'Tarde';

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
        
        console.log('Filtrando por fecha:', { original: filters.date, formatted: formattedDate });
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

export const arrivalService = {
  createArrivalRecord,
  getArrivals,
  getMonthlyAttendance,
  getTodayStats,
};
