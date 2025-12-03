import { supabase } from '../supabaseClient';
import { Incident, EducationalLevel, EstadoIncidencia } from '@/types';

/**
 * Servicio de incidencias
 */
export const incidentsService = {
  /**
   * Crear nueva incidencia
   * El nivel de reincidencia se calcula automáticamente por el trigger de la base de datos
   */
  async create(incident: {
    studentId: number;
    faultTypeId: number;
    registeredBy: number;
    observations?: string;
  }): Promise<{ incident: Incident | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('incidencias')
        .insert({
          id_estudiante: incident.studentId,
          id_falta: incident.faultTypeId,
          id_usuario_registro: incident.registeredBy,
          observaciones: incident.observations || null,
        })
        .select(`
          *,
          estudiantes:id_estudiante (
            id_estudiante,
            codigo_barras,
            nombre_completo,
            grado,
            seccion,
            nivel_educativo,
            foto_perfil,
            activo
          ),
          catalogos_faltas:id_falta (
            id_falta,
            nombre_falta,
            categoria,
            es_grave,
            puntos_reincidencia,
            descripcion,
            activo
          ),
          usuarios_registro:id_usuario_registro (
            id_usuario,
            username,
            nombre_completo,
            email,
            rol,
            activo
          )
        `)
        .single();

      if (error) {
        console.error('Error al crear incidencia:', error);
        return { incident: null, error: error.message };
      }

      return { incident: this.mapDBToIncident(data), error: null };
    } catch (error: any) {
      console.error('Error en create:', error);
      return { incident: null, error: error.message || 'Error al crear incidencia' };
    }
  },

  /**
   * Obtener todas las incidencias con filtros
   */
  async getAll(filters?: {
    estudianteId?: number;
    estado?: EstadoIncidencia;
    fechaDesde?: string;
    fechaHasta?: string;
    grado?: string;
    seccion?: string;
    nivelEducativo?: EducationalLevel;
    nivelReincidencia?: number;
    bimestre?: number; // 1-4
    añoEscolar?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ incidents: Incident[]; total: number; error: string | null }> {
    try {
      // Si se especifica bimestre, calcular fechas automáticamente
      let fechaDesde = filters?.fechaDesde;
      let fechaHasta = filters?.fechaHasta;
      
      if (filters?.bimestre && filters?.añoEscolar) {
        const { getBimestreDates } = await import('@/lib/utils/bimestreUtils');
        const { inicio, fin } = getBimestreDates(filters.bimestre as 1 | 2 | 3 | 4, filters.añoEscolar);
        fechaDesde = inicio.toISOString();
        fechaHasta = fin.toISOString();
      }

      let query = supabase
        .from('incidencias')
        .select(`
          *,
          estudiantes:id_estudiante (
            id_estudiante,
            codigo_barras,
            nombre_completo,
            grado,
            seccion,
            nivel_educativo,
            foto_perfil,
            activo
          ),
          catalogos_faltas:id_falta (
            id_falta,
            nombre_falta,
            categoria,
            es_grave,
            puntos_reincidencia,
            descripcion,
            activo
          ),
          usuarios_registro:id_usuario_registro (
            id_usuario,
            username,
            nombre_completo,
            email,
            rol,
            activo
          )
        `, { count: 'exact' });

      if (filters?.estudianteId) {
        query = query.eq('id_estudiante', filters.estudianteId);
      }

      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }

      if (fechaDesde) {
        query = query.gte('fecha_hora_registro', fechaDesde);
      }

      if (fechaHasta) {
        query = query.lte('fecha_hora_registro', fechaHasta);
      }

      if (filters?.grado) {
        query = query.eq('estudiantes.grado', filters.grado);
      }

      if (filters?.seccion) {
        query = query.eq('estudiantes.seccion', filters.seccion);
      }

      if (filters?.nivelEducativo) {
        query = query.eq('estudiantes.nivel_educativo', filters.nivelEducativo);
      }

      if (filters?.nivelReincidencia !== undefined) {
        query = query.eq('nivel_reincidencia', filters.nivelReincidencia);
      }

      // Ordenar por fecha más reciente primero
      query = query.order('fecha_hora_registro', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error al obtener incidencias:', error);
        return { incidents: [], total: 0, error: error.message };
      }

      const incidents: Incident[] = (data || []).map((inc: any) => this.mapDBToIncident(inc));

      return { incidents, total: count || 0, error: null };
    } catch (error: any) {
      console.error('Error en getAll:', error);
      return { incidents: [], total: 0, error: error.message || 'Error al obtener incidencias' };
    }
  },

  /**
   * Anular incidencia
   */
  async annul(
    id: number,
    idUsuario: number,
    motivo: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (motivo.length < 20) {
        return { success: false, error: 'El motivo debe tener al menos 20 caracteres' };
      }

      // Usar la función de la base de datos
      const { data, error } = await supabase.rpc('anular_incidencia', {
        p_id_incidencia: id,
        p_id_usuario: idUsuario,
        p_motivo: motivo,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en annul:', error);
      return { success: false, error: error.message || 'Error al anular incidencia' };
    }
  },

  /**
   * Justificar incidencia
   * Cambia el estado a "Justificada" y guarda el motivo
   */
  async justify(
    id: number,
    idUsuario: number,
    motivo: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (motivo.length < 10) {
        return { success: false, error: 'El motivo de justificación debe tener al menos 10 caracteres' };
      }

      // Actualizar la incidencia
      const { error } = await supabase
        .from('incidencias')
        .update({
          estado: 'Justificada',
          motivo_anulacion: motivo, // Usamos el mismo campo para guardar el motivo
          id_usuario_anulacion: idUsuario, // Usamos el mismo campo para guardar quién justificó
          fecha_anulacion: new Date().toISOString(), // Usamos el mismo campo para guardar la fecha
        })
        .eq('id_incidencia', id)
        .eq('estado', 'Activa'); // Solo permitir justificar incidencias activas

      if (error) {
        console.error('Error al justificar incidencia:', error);
        return { success: false, error: error.message || 'Error al justificar incidencia' };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en justify:', error);
      return { success: false, error: error.message || 'Error al justificar incidencia' };
    }
  },

  /**
   * Registrar impresión de incidencia
   */
  async registerPrint(id: number): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('incidencias')
        .update({
          veces_impreso: supabase.raw('veces_impreso + 1'),
          fecha_ultima_impresion: new Date().toISOString(),
        })
        .eq('id_incidencia', id);

      if (error) {
        return { success: false, error: error.message || 'Error al registrar impresión' };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en registerPrint:', error);
      return { success: false, error: error.message || 'Error al registrar impresión' };
    }
  },

  /**
   * Mapear datos de DB a tipo Incident
   */
  mapDBToIncident(data: any): Incident {
    const estudiante = data.estudiantes || data.id_estudiante;
    const falta = data.catalogos_faltas || data.id_falta;
    const usuario = data.usuarios_registro || data.id_usuario_registro;

    return {
      id: data.id_incidencia,
      studentId: data.id_estudiante,
      student: estudiante && typeof estudiante === 'object' ? {
        id: estudiante.id_estudiante,
        fullName: estudiante.nombre_completo,
        grade: estudiante.grado,
        section: estudiante.seccion,
        level: (estudiante.nivel_educativo || 'Secundaria') as EducationalLevel,
        barcode: estudiante.codigo_barras,
        profilePhoto: estudiante.foto_perfil,
        active: estudiante.activo,
      } : undefined,
      faultTypeId: data.id_falta,
      faultType: falta && typeof falta === 'object' ? {
        id: falta.id_falta,
        name: falta.nombre_falta,
        description: falta.descripcion,
        category: falta.categoria,
        severity: falta.es_grave ? 'Grave' : 'Leve',
        points: falta.puntos_reincidencia,
        active: falta.activo,
      } : undefined,
      registeredBy: data.id_usuario_registro,
      registeredByUser: usuario && typeof usuario === 'object' ? {
        id: usuario.id_usuario,
        username: usuario.username,
        fullName: usuario.nombre_completo,
        email: usuario.email,
        role: usuario.rol,
        active: usuario.activo,
      } : undefined,
      registeredAt: data.fecha_hora_registro,
      observations: data.observaciones,
      reincidenceLevel: data.nivel_reincidencia as any,
      hasEvidence: data.estado_evidencia === 'Con evidencia',
      evidenceCount: data.cantidad_fotos,
      status: data.estado,
      annulledBy: data.id_usuario_anulacion,
      annulledAt: data.fecha_anulacion,
      annulmentReason: data.motivo_anulacion,
    };
  },
};
