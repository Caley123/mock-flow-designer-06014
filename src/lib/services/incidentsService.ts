import { supabase } from '../supabaseClient';
import { Incident, IncidenciaDB, EstadoIncidencia } from '@/types';

/**
 * Servicio de incidencias
 */
export const incidentsService = {
  /**
   * Crear nueva incidencia
   * El nivel de reincidencia se calcula automáticamente por el trigger de la base de datos
   */
  async create(incident: {
    id_estudiante: number;
    id_falta: number;
    id_usuario_registro: number;
    observaciones?: string;
  }): Promise<{ incident: Incident | null; error: string | null }> {
    try {
      // Crear la incidencia directamente
      // El trigger de auditoría usará el id_usuario_registro del registro insertado
      const { data, error } = await supabase
        .from('incidencias')
        .insert({
          id_estudiante: incident.id_estudiante,
          id_falta: incident.id_falta,
          id_usuario_registro: incident.id_usuario_registro,
          observaciones: incident.observaciones || null,
          estado: 'Activa',
        })
        .select()
        .single();

      if (error) {
        return { incident: null, error: error.message };
      }

      // Obtener la incidencia con relaciones
      return await this.getById(data.id_incidencia);
    } catch (error: any) {
      console.error('Error en create:', error);
      return { incident: null, error: error.message || 'Error al crear incidencia' };
    }
  },

  /**
   * Obtener incidencia por ID con todas las relaciones
   */
  async getById(id: number): Promise<{ incident: Incident | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('incidencias')
        .select(`
          *,
          estudiantes:id_estudiante (
            id_estudiante,
            codigo_barras,
            nombre_completo,
            grado,
            seccion,
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
        .eq('id_incidencia', id)
        .single();

      if (error || !data) {
        return { incident: null, error: 'Incidencia no encontrada' };
      }

      const incident: Incident = this.mapDBToIncident(data as any);

      return { incident, error: null };
    } catch (error: any) {
      console.error('Error en getById:', error);
      return { incident: null, error: error.message || 'Error al obtener incidencia' };
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
    nivelReincidencia?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ incidents: Incident[]; total: number; error: string | null }> {
    try {
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

      if (filters?.fechaDesde) {
        query = query.gte('fecha_hora_registro', filters.fechaDesde);
      }

      if (filters?.fechaHasta) {
        query = query.lte('fecha_hora_registro', filters.fechaHasta);
      }

      if (filters?.nivelReincidencia !== undefined) {
        query = query.eq('nivel_reincidencia', filters.nivelReincidencia);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query
        .order('fecha_hora_registro', { ascending: false });

      if (error) {
        return { incidents: [], total: 0, error: error.message };
      }

      // Filtrar por grado/sección si es necesario (después de obtener datos)
      let incidents = (data || []).map((inc: any) => this.mapDBToIncident(inc));

      if (filters?.grado) {
        incidents = incidents.filter(inc => inc.student?.grade === filters.grado);
      }

      if (filters?.seccion) {
        incidents = incidents.filter(inc => inc.student?.section === filters.seccion);
      }

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
   * Registrar impresión de incidencia
   */
  async registerPrint(id: number): Promise<{ success: boolean; error: string | null }> {
    try {
      // Obtener el valor actual primero
      const { data: currentData } = await supabase
        .from('incidencias')
        .select('veces_impreso')
        .eq('id_incidencia', id)
        .single();

      const nuevasVeces = (currentData?.veces_impreso || 0) + 1;

      const { error } = await supabase
        .from('incidencias')
        .update({
          veces_impreso: nuevasVeces,
          fecha_ultima_impresion: new Date().toISOString(),
        })
        .eq('id_incidencia', id);

      if (error) {
        return { success: false, error: error.message };
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
        barcode: estudiante.codigo_barras,
        photo: estudiante.foto_perfil,
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
