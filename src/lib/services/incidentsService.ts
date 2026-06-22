import { supabase } from '../supabaseClient';
import { Incident, EducationalLevel, EstadoIncidencia } from '@/types';
import { fetchAllPages } from '@/lib/utils/supabasePagination';

const INCIDENT_LIST_SELECT = `
  id_incidencia,
  id_estudiante,
  id_falta,
  id_usuario_registro,
  fecha_hora_registro,
  observaciones,
  nivel_reincidencia,
  estado_evidencia,
  cantidad_fotos,
  estado,
  estudiantes:id_estudiante (
    id_estudiante,
    codigo_barras,
    nombre_completo,
    grado,
    seccion,
    nivel_educativo,
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
    nombre_completo
  )
`;

const INCIDENT_FULL_SELECT = `
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
    nombre_completo
  )
`;

export interface IncidentsListFilters {
  estudianteId?: number;
  estado?: EstadoIncidencia;
  fechaDesde?: string;
  fechaHasta?: string;
  grado?: string;
  seccion?: string;
  nivelEducativo?: EducationalLevel;
  nivelReincidencia?: number;
  bimestre?: number;
  añoEscolar?: number;
  search?: string;
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
  fetchAll?: boolean;
}

export interface IncidentsListSummary {
  total: number;
  activas: number;
  conEvidencia: number;
}

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&');
}

async function resolveDateRange(filters?: IncidentsListFilters): Promise<{
  fechaDesde?: string;
  fechaHasta?: string;
}> {
  let fechaDesde = filters?.fechaDesde;
  let fechaHasta = filters?.fechaHasta;

  if (filters?.bimestre && filters?.añoEscolar) {
    const { getBimestreDates } = await import('@/lib/utils/bimestreUtils');
    const { inicio, fin } = getBimestreDates(filters.bimestre as 1 | 2 | 3 | 4, filters.añoEscolar);
    fechaDesde = inicio.toISOString();
    fechaHasta = fin.toISOString();
  }

  return { fechaDesde, fechaHasta };
}

function applyIncidentFilters(
  query: any,
  filters: IncidentsListFilters | undefined,
  dateRange: { fechaDesde?: string; fechaHasta?: string },
) {

  if (filters?.estudianteId) {
    query = query.eq('id_estudiante', filters.estudianteId);
  }

  if (filters?.estado) {
    query = query.eq('estado', filters.estado);
  }

  if (dateRange.fechaDesde) {
    query = query.gte('fecha_hora_registro', dateRange.fechaDesde);
  }

  if (dateRange.fechaHasta) {
    query = query.lte('fecha_hora_registro', dateRange.fechaHasta);
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

  const search = filters?.search?.trim();
  if (search) {
    const escaped = escapeIlike(search);
    const idNum = Number.parseInt(search, 10);
    if (!Number.isNaN(idNum) && String(idNum) === search.replace(/\s/g, '')) {
      query = query.or(
        `id_incidencia.eq.${idNum},estudiantes.nombre_completo.ilike.%${escaped}%,catalogos_faltas.nombre_falta.ilike.%${escaped}%`,
      );
    } else {
      query = query.or(
        `estudiantes.nombre_completo.ilike.%${escaped}%,catalogos_faltas.nombre_falta.ilike.%${escaped}%`,
      );
    }
  }

  return query;
}

/**
 * Servicio de incidencias
 */
export const incidentsService = {
  /**
   * Crear nueva incidencia
   * El nivel de reincidencia se calcula automáticamente por el trigger de la base de datos
   */
  async create(
    incident: {
      studentId: number;
      faultTypeId: number;
      registeredBy: number;
      observations?: string;
    },
    options?: { minimal?: boolean },
  ): Promise<{ incident: Incident | null; error: string | null }> {
    try {
      const insertQuery = supabase.from('incidencias').insert({
        id_estudiante: incident.studentId,
        id_falta: incident.faultTypeId,
        id_usuario_registro: incident.registeredBy,
        observaciones: incident.observations || null,
      });

      if (options?.minimal) {
        const { data, error } = await insertQuery.select('id_incidencia').single();
        if (error) {
          console.error('Error al crear incidencia:', error);
          return { incident: null, error: error.message };
        }
        return {
          incident: { id: data.id_incidencia } as Incident,
          error: null,
        };
      }

      const { data, error } = await insertQuery
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
            nombre_completo
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
   * Obtener incidencias con filtros (paginado por defecto; fetchAll solo para exportación).
   */
  async getAll(
    filters?: IncidentsListFilters,
  ): Promise<{ incidents: Incident[]; total: number; error: string | null }> {
    try {
      const dateRange = await resolveDateRange(filters);
      const useFullSelect = Boolean(filters?.fetchAll && filters?.estudianteId);

      if (filters?.fetchAll) {
        const { data, error } = await fetchAllPages<Incident>(async (from, to) => {
          const pageSize = to - from + 1;
          const pageResult = await this.fetchIncidentPage(
            filters,
            dateRange,
            from,
            pageSize,
            useFullSelect,
          );
          return {
            data: pageResult.incidents,
            error: pageResult.error
              ? { message: pageResult.error, details: '', hint: '', code: '' }
              : null,
          };
        });

        if (error) {
          return { incidents: [], total: 0, error };
        }

        return { incidents: data, total: data.length, error: null };
      }

      const pageSize = filters?.pageSize ?? 10;
      const page = Math.max(1, filters?.page ?? 1);
      const offset =
        filters?.offset != null ? filters.offset : (page - 1) * pageSize;

      const usesPagePagination = filters?.page != null || filters?.pageSize != null;

      return this.fetchIncidentPage(
        filters,
        dateRange,
        usesPagePagination ? offset : undefined,
        usesPagePagination ? pageSize : filters?.limit,
        useFullSelect,
      );
    } catch (error: any) {
      console.error('Error en getAll:', error);
      return { incidents: [], total: 0, error: error.message || 'Error al obtener incidencias' };
    }
  },

  async fetchIncidentPage(
    filters: IncidentsListFilters | undefined,
    dateRange: { fechaDesde?: string; fechaHasta?: string },
    offset: number | undefined,
    limit: number | undefined,
    fullSelect = false,
  ): Promise<{ incidents: Incident[]; total: number; error: string | null }> {
    const selectClause = fullSelect ? INCIDENT_FULL_SELECT : INCIDENT_LIST_SELECT;

    let query = supabase
      .from('incidencias')
      .select(selectClause, { count: 'exact' });

    query = applyIncidentFilters(query, filters, dateRange);
    query = query.order('fecha_hora_registro', { ascending: false });

    if (offset != null && limit != null) {
      query = query.range(offset, offset + limit - 1);
    } else if (limit != null) {
      query = query.limit(limit);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error al obtener incidencias:', error);
      return { incidents: [], total: 0, error: error.message };
    }

    const incidents: Incident[] = (data || []).map((inc: any) => this.mapDBToIncident(inc));
    return { incidents, total: count || 0, error: null };
  },

  /** Totales para KPIs del listado (consultas ligeras en paralelo). */
  async getListSummary(
    filters?: Pick<IncidentsListFilters, 'nivelEducativo' | 'search' | 'fechaDesde' | 'fechaHasta'>,
  ): Promise<{ summary: IncidentsListSummary; error: string | null }> {
    try {
      const dateRange = await resolveDateRange(filters);

      const countFiltered = async (extra?: Record<string, string>) => {
        let query = supabase
          .from('incidencias')
          .select('id_incidencia', { count: 'exact', head: true });
        query = applyIncidentFilters(query, filters, dateRange) as typeof query;
        if (extra?.estado) {
          query = query.eq('estado', extra.estado);
        }
        if (extra?.estado_evidencia) {
          query = query.eq('estado_evidencia', extra.estado_evidencia);
        }
        const { count, error } = await query;
        if (error) throw new Error(error.message);
        return count ?? 0;
      };

      const [total, activas, conEvidencia] = await Promise.all([
        countFiltered(),
        countFiltered({ estado: 'Activa' }),
        countFiltered({ estado_evidencia: 'Con evidencia' }),
      ]);

      return {
        summary: { total, activas, conEvidencia },
        error: null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al obtener resumen';
      return {
        summary: { total: 0, activas: 0, conEvidencia: 0 },
        error: message,
      };
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
      // Leer el contador actual e incrementarlo (Supabase JS no expone .raw)
      const { data: current, error: fetchError } = await supabase
        .from('incidencias')
        .select('veces_impreso')
        .eq('id_incidencia', id)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message || 'Error al registrar impresión' };
      }

      const nuevoConteo = ((current?.veces_impreso as number) || 0) + 1;

      const { error } = await supabase
        .from('incidencias')
        .update({
          veces_impreso: nuevoConteo,
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
