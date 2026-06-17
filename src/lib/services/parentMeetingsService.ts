import { supabase } from '../supabaseClient';
import { ParentMeeting, CitaPadreDB } from '@/types';
import { getLimaTodayDate } from '@/lib/utils/limaDateTime';
import { gradeFilterValues } from '@/lib/utils/gradeAliases';
import { fetchAllPages } from '@/lib/utils/supabasePagination';

const INSERT_BATCH_SIZE = 200;

/**
 * Servicio para gestionar citas con padres
 */

/**
 * Mapear cita de DB a formato frontend
 */
function mapDBToParentMeeting(data: CitaPadreDB & {
  estudiante?: any;
  usuario_creador?: any;
}): ParentMeeting {
  return {
    id: data.id_cita,
    studentId: data.id_estudiante,
    student: data.estudiante ? {
      id: data.estudiante.id_estudiante,
      fullName: data.estudiante.nombre_completo,
      grade: data.estudiante.grado,
      section: data.estudiante.seccion,
      level: data.estudiante.nivel_educativo,
      barcode: data.estudiante.codigo_barras,
      profilePhoto: data.estudiante.foto_perfil,
      active: data.estudiante.activo,
    } : undefined,
    motivo: data.motivo,
    fecha: data.fecha,
    hora: data.hora,
    estado: data.estado,
    asistencia: data.asistencia,
    llegadaTarde: (data as any).llegada_tarde ?? null,
    horaLlegadaReal: (data as any).hora_llegada_real ?? null,
    notas: data.notas,
    createdBy: data.id_usuario_creador,
    createdByUser: data.usuario_creador ? {
      id: data.usuario_creador.id_usuario,
      username: data.usuario_creador.username,
      fullName: data.usuario_creador.nombre_completo,
      email: data.usuario_creador.email,
      role: data.usuario_creador.rol,
      active: data.usuario_creador.activo,
    } : undefined,
    createdAt: data.fecha_creacion,
    updatedAt: data.fecha_actualizacion,
  };
}

export const parentMeetingsService = {
  /**
   * Crear nueva cita con padre
   */
  async create(meeting: {
    id_estudiante: number;
    motivo: string;
    fecha: string; // YYYY-MM-DD
    hora: string; // HH:MM
    id_usuario_creador: number;
    notas?: string;
  }): Promise<{ meeting: ParentMeeting | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('citas_padres')
        .insert({
          id_estudiante: meeting.id_estudiante,
          motivo: meeting.motivo,
          fecha: meeting.fecha,
          hora: meeting.hora,
          id_usuario_creador: meeting.id_usuario_creador,
          estado: 'Pendiente',
          notas: meeting.notas || null,
          asistencia: null,
        })
        .select()
        .single();

      if (error) {
        return { meeting: null, error: error.message };
      }

      // Obtener la cita completa con relaciones
      return await this.getById(data.id_cita);
    } catch (error: any) {
      console.error('Error en create:', error);
      return { meeting: null, error: error.message || 'Error al crear cita' };
    }
  },

  /**
   * Crear citas masivas
   */
  async createBulk(meetings: {
    motivo: string;
    fecha: string; // YYYY-MM-DD
    hora: string; // HH:MM
    id_usuario_creador: number;
    notas?: string;
    tipo: 'all' | 'grade' | 'section' | 'students';
    grade?: string;
    section?: string;
    level?: string;
    studentIds?: number[];
  }): Promise<{ success: boolean; count: number; error: string | null }> {
    try {
      const studentIdsResult = await fetchActiveStudentIdsForBulk(meetings);
      if (studentIdsResult.error) {
        return { success: false, count: 0, error: studentIdsResult.error };
      }

      const studentIds = studentIdsResult.ids;
      if (studentIds.length === 0) {
        return { success: false, count: 0, error: 'No se encontraron estudiantes para crear las citas' };
      }

      const citas = studentIds.map((id_estudiante) => ({
        id_estudiante,
        motivo: meetings.motivo,
        fecha: meetings.fecha,
        hora: meetings.hora,
        id_usuario_creador: meetings.id_usuario_creador,
        estado: 'Pendiente' as const,
        notas: meetings.notas || null,
        asistencia: null,
      }));

      let inserted = 0;
      for (let i = 0; i < citas.length; i += INSERT_BATCH_SIZE) {
        const batch = citas.slice(i, i + INSERT_BATCH_SIZE);
        const { error } = await supabase.from('citas_padres').insert(batch);
        if (error) {
          const partial =
            inserted > 0
              ? ` Se crearon ${inserted} citas antes del error.`
              : '';
          return {
            success: false,
            count: inserted,
            error: `${error.message}${partial}`,
          };
        }
        inserted += batch.length;
      }

      return { success: true, count: inserted, error: null };
    } catch (error: any) {
      console.error('Error en createBulk:', error);
      return { success: false, count: 0, error: error.message || 'Error al crear citas masivas' };
    }
  },

  /**
   * Obtener cita por ID
   */
  async getById(id: number): Promise<{ meeting: ParentMeeting | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('citas_padres')
        .select(`
          *,
          estudiante:estudiantes!citas_padres_id_estudiante_fkey(*),
          usuario_creador:usuarios!citas_padres_id_usuario_creador_fkey(*)
        `)
        .eq('id_cita', id)
        .single();

      if (error || !data) {
        return { meeting: null, error: 'Cita no encontrada' };
      }

      const meeting = mapDBToParentMeeting(data as any);
      return { meeting, error: null };
    } catch (error: any) {
      console.error('Error en getById:', error);
      return { meeting: null, error: error.message || 'Error al obtener cita' };
    }
  },

  /**
   * Obtener todas las citas con filtros
   */
  async getAll(filters?: {
    estudianteId?: number;
    estado?: 'Pendiente' | 'Confirmada' | 'Reprogramada' | 'Completada' | 'No asistió' | 'Cancelada';
    fechaDesde?: string;
    fechaHasta?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ meetings: ParentMeeting[]; total: number; error: string | null }> {
    try {
      const buildQuery = () => {
        let query = supabase
          .from('citas_padres')
          .select(
            `
            *,
            estudiante:estudiantes!citas_padres_id_estudiante_fkey(*),
            usuario_creador:usuarios!citas_padres_id_usuario_creador_fkey(*)
          `,
            filters?.limit !== undefined || filters?.offset !== undefined
              ? { count: 'exact' }
              : undefined
          )
          .order('fecha', { ascending: false })
          .order('hora', { ascending: false });

        if (filters?.estudianteId) {
          query = query.eq('id_estudiante', filters.estudianteId);
        }
        if (filters?.estado) {
          query = query.eq('estado', filters.estado);
        }
        if (filters?.fechaDesde) {
          query = query.gte('fecha', filters.fechaDesde);
        }
        if (filters?.fechaHasta) {
          query = query.lte('fecha', filters.fechaHasta);
        }
        return query;
      };

      if (filters?.limit !== undefined || filters?.offset !== undefined) {
        const offset = filters.offset ?? 0;
        const limit = filters.limit ?? 10;
        const { data, error, count } = await buildQuery().range(offset, offset + limit - 1);
        if (error) {
          return { meetings: [], total: 0, error: error.message };
        }
        const meetings = (data || []).map((item: any) => mapDBToParentMeeting(item));
        return { meetings, total: count ?? meetings.length, error: null };
      }

      const { data, error } = await fetchAllPages((from, to) =>
        buildQuery().range(from, to)
      );

      if (error) {
        return { meetings: [], total: 0, error };
      }

      const meetings = data.map((item: any) => mapDBToParentMeeting(item));
      return { meetings, total: meetings.length, error: null };
    } catch (error: any) {
      console.error('Error en getAll:', error);
      return { meetings: [], total: 0, error: error.message || 'Error al obtener citas' };
    }
  },

  /**
   * Actualizar cita
   */
  async update(
    id: number,
    updates: Partial<{
      motivo: string;
      fecha: string;
      hora: string;
      estado: 'Pendiente' | 'Confirmada' | 'Reprogramada' | 'Completada' | 'No asistió' | 'Cancelada';
      asistencia: boolean;
      notas: string;
    }>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('citas_padres')
        .update({
          ...updates,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id_cita', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en update:', error);
      return { success: false, error: error.message || 'Error al actualizar cita' };
    }
  },

  /**
   * Registrar asistencia a cita por código de barras
   */
  async markAttendanceByBarcode(
    barcode: string,
    llegadaTarde: boolean = false
  ): Promise<{ success: boolean; meetingId: number | null; error: string | null }> {
    try {
      // Buscar estudiante por código de barras
      const { data: student, error: studentError } = await supabase
        .from('estudiantes')
        .select('id_estudiante')
        .eq('codigo_barras', barcode)
        .eq('activo', true)
        .single();

      if (studentError || !student) {
        return { success: false, meetingId: null, error: 'Estudiante no encontrado con ese código de barras' };
      }

      // Buscar citas pendientes o confirmadas para hoy
      const today = getLimaTodayDate();
      const { data: meetings, error: meetingsError } = await supabase
        .from('citas_padres')
        .select('id_cita, hora')
        .eq('id_estudiante', student.id_estudiante)
        .eq('fecha', today)
        .in('estado', ['Pendiente', 'Confirmada'])
        .is('asistencia', null)
        .order('hora', { ascending: false })
        .limit(1);

      if (meetingsError || !meetings || meetings.length === 0) {
        return { success: false, meetingId: null, error: 'No se encontró una cita pendiente para hoy con este estudiante' };
      }

      const meeting = meetings[0];
      const horaActual = new Date().toTimeString().slice(0, 5); // HH:MM
      const horaCita = meeting.hora.slice(0, 5); // HH:MM
      
      // Determinar si llegó tarde comparando horas
      const [horaActualH, horaActualM] = horaActual.split(':').map(Number);
      const [horaCitaH, horaCitaM] = horaCita.split(':').map(Number);
      const minutosActual = horaActualH * 60 + horaActualM;
      const minutosCita = horaCitaH * 60 + horaCitaM;
      const esTarde = minutosActual > minutosCita + 5; // 5 minutos de tolerancia

      const updateData: any = {
        asistencia: true,
        estado: 'Completada',
        llegada_tarde: llegadaTarde || esTarde,
        hora_llegada_real: horaActual,
        fecha_actualizacion: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('citas_padres')
        .update(updateData)
        .eq('id_cita', meeting.id_cita);

      if (error) {
        return { success: false, meetingId: null, error: error.message };
      }

      return { success: true, meetingId: meeting.id_cita, error: null };
    } catch (error: any) {
      console.error('Error en markAttendanceByBarcode:', error);
      return { success: false, meetingId: null, error: error.message || 'Error al registrar asistencia' };
    }
  },

  /**
   * Registrar asistencia a cita
   */
  async markAttendance(
    id: number,
    asistio: boolean,
    llegadaTarde?: boolean,
    notas?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const estado = asistio ? 'Completada' : 'No asistió';
      
      const updateData: any = {
        asistencia: asistio,
        estado,
        fecha_actualizacion: new Date().toISOString(),
      };

      if (asistio && llegadaTarde !== undefined) {
        updateData.llegada_tarde = llegadaTarde;
        if (llegadaTarde) {
          updateData.hora_llegada_real = new Date().toTimeString().slice(0, 5);
        }
      }

      if (notas) {
        updateData.notas = notas;
      }

      const { error } = await supabase
        .from('citas_padres')
        .update(updateData)
        .eq('id_cita', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en markAttendance:', error);
      return { success: false, error: error.message || 'Error al registrar asistencia' };
    }
  },

  /**
   * Cancelar cita
   */
  async cancel(id: number, motivo?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const updateData: any = {
        estado: 'Cancelada',
        fecha_actualizacion: new Date().toISOString(),
      };

      if (motivo) {
        updateData.notas = motivo;
      }

      const { error } = await supabase
        .from('citas_padres')
        .update(updateData)
        .eq('id_cita', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en cancel:', error);
      return { success: false, error: error.message || 'Error al cancelar cita' };
    }
  },

  /**
   * Obtener estadísticas de citas
   */
  async getStats(filters?: {
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<{
    stats: {
      total: number;
      pendientes: number;
      confirmadas: number;
      completadas: number;
      noAsistieron: number;
      tasaAsistencia: number;
    } | null;
    error: string | null;
  }> {
    try {
      const countByEstado = async (
        estado?: 'Pendiente' | 'Confirmada' | 'Completada' | 'No asistió'
      ) => {
        let query = supabase
          .from('citas_padres')
          .select('*', { count: 'exact', head: true });

        if (estado) {
          query = query.eq('estado', estado);
        }
        if (filters?.fechaDesde) {
          query = query.gte('fecha', filters.fechaDesde);
        }
        if (filters?.fechaHasta) {
          query = query.lte('fecha', filters.fechaHasta);
        }

        const { count, error } = await query;
        if (error) {
          throw new Error(error.message);
        }
        return count ?? 0;
      };

      const [total, pendientes, confirmadas, completadas, noAsistieron] = await Promise.all([
        countByEstado(),
        countByEstado('Pendiente'),
        countByEstado('Confirmada'),
        countByEstado('Completada'),
        countByEstado('No asistió'),
      ]);

      const totalConAsistencia = completadas + noAsistieron;
      const tasaAsistencia =
        totalConAsistencia > 0 ? Math.round((completadas / totalConAsistencia) * 100) : 0;

      return {
        stats: {
          total,
          pendientes,
          confirmadas,
          completadas,
          noAsistieron,
          tasaAsistencia,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error en getStats:', error);
      return { stats: null, error: error.message || 'Error al obtener estadísticas' };
    }
  },
};

async function fetchActiveStudentIdsForBulk(meetings: {
  tipo: 'all' | 'grade' | 'section' | 'students';
  grade?: string;
  section?: string;
  level?: string;
  studentIds?: number[];
}): Promise<{ ids: number[]; error: string | null }> {
  if (meetings.tipo === 'students' && meetings.studentIds?.length) {
    return { ids: meetings.studentIds, error: null };
  }

  if (meetings.tipo === 'grade' && !meetings.grade) {
    return { ids: [], error: 'Debe seleccionar un grado' };
  }

  if (meetings.tipo === 'section' && (!meetings.grade || !meetings.section)) {
    return { ids: [], error: 'Debe seleccionar grado y sección' };
  }

  const { data, error } = await fetchAllPages<{ id_estudiante: number }>((from, to) => {
    let query = supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('activo', true);

    if (meetings.tipo === 'grade' && meetings.grade) {
      query = query.in('grado', gradeFilterValues(meetings.grade));
      if (meetings.level) {
        query = query.eq('nivel_educativo', meetings.level);
      }
    } else if (meetings.tipo === 'section' && meetings.grade && meetings.section) {
      query = query
        .in('grado', gradeFilterValues(meetings.grade))
        .eq('seccion', meetings.section);
      if (meetings.level) {
        query = query.eq('nivel_educativo', meetings.level);
      }
    }

    return query.range(from, to);
  });

  if (error) {
    return { ids: [], error };
  }

  return { ids: data.map((row) => row.id_estudiante), error: null };
}

