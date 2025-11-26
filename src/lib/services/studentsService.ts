import { supabase } from '../supabaseClient';
import { Student, EstudianteDB, EducationalLevel } from '@/types';

/**
 * Servicio de estudiantes
 */
export const studentsService = {
  /**
   * Buscar estudiante por código de barras
   */
  async getByBarcode(barcode: string): Promise<{ student: Student | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('codigo_barras', barcode)
        .eq('activo', true)
        .single();

      if (error || !data) {
        return { student: null, error: 'Estudiante no encontrado' };
      }

      // Obtener nivel de reincidencia usando la vista
      const { data: nivelData } = await supabase
        .from('v_estudiantes_nivel_actual')
        .select('nivel_actual, total_faltas_60_dias')
        .eq('id_estudiante', data.id_estudiante)
        .single();

      const student: Student = {
        id: data.id_estudiante,
        fullName: data.nombre_completo,
        grade: data.grado,
        section: data.seccion,
        level: data.nivel_educativo as EducationalLevel,
        barcode: data.codigo_barras,
        profilePhoto: data.foto_perfil,
        reincidenceLevel: (nivelData?.nivel_actual || 0) as any,
        faultsLast60Days: nivelData?.total_faltas_60_dias || 0,
        active: data.activo,
      };

      return { student, error: null };
    } catch (error: any) {
      console.error('Error en getByBarcode:', error);
      return { student: null, error: error.message || 'Error al buscar estudiante' };
    }
  },

  /**
   * Buscar estudiantes por nombre (autocompletado)
   */
  async searchByName(query: string, limit: number = 10): Promise<{ students: Student[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .ilike('nombre_completo', `%${query}%`)
        .eq('activo', true)
        .limit(limit);

      if (error) {
        return { students: [], error: error.message };
      }

      const students: Student[] = (data || []).map((est: EstudianteDB) => ({
        id: est.id_estudiante,
        fullName: est.nombre_completo,
        grade: est.grado,
        section: est.seccion,
        level: est.nivel_educativo as EducationalLevel,
        barcode: est.codigo_barras,
        profilePhoto: est.foto_perfil,
        active: est.activo,
      }));

      return { students, error: null };
    } catch (error: any) {
      console.error('Error en searchByName:', error);
      return { students: [], error: error.message || 'Error al buscar estudiantes' };
    }
  },

  /**
   * Obtener todos los estudiantes con filtros
   */
  async getAll(filters?: {
    grade?: string;
    section?: string;
    level?: EducationalLevel;
    active?: boolean;
    search?: string;
  }): Promise<{ students: Student[]; error: string | null }> {
    try {
      let query = supabase
        .from('estudiantes')
        .select('*');

      if (filters?.grade) {
        query = query.eq('grado', filters.grade);
      }

      if (filters?.section) {
        query = query.eq('seccion', filters.section);
      }

      if (filters?.level) {
        query = query.eq('nivel_educativo', filters.level);
      }

      if (filters?.active !== undefined) {
        query = query.eq('activo', filters.active);
      }

      if (filters?.search) {
        // Buscar por nombre O código de barras usando OR de Supabase
        const searchPattern = `%${filters.search}%`;
        // Sintaxis PostgREST: campo1.operador.valor,campo2.operador.valor
        query = query.or(`nombre_completo.ilike.${searchPattern},codigo_barras.ilike.${searchPattern}`);
      }

      const { data, error } = await query.order('nombre_completo', { ascending: true });

      if (error) {
        return { students: [], error: error.message };
      }

      // Obtener niveles de reincidencia para todos los estudiantes desde la vista
      const studentIds = (data || []).map((est: EstudianteDB) => est.id_estudiante);
      
      let nivelDataMap: Record<number, { nivel_actual: number; total_faltas_60_dias: number }> = {};
      
      if (studentIds.length > 0) {
        // Consultar la vista para obtener los niveles
        const { data: nivelesData } = await supabase
          .from('v_estudiantes_nivel_actual')
          .select('id_estudiante, nivel_actual, total_faltas_60_dias')
          .in('id_estudiante', studentIds);
        
        if (nivelesData) {
          nivelesData.forEach((nivel: any) => {
            nivelDataMap[nivel.id_estudiante] = {
              nivel_actual: nivel.nivel_actual || 0,
              total_faltas_60_dias: nivel.total_faltas_60_dias || 0,
            };
          });
        }
      }

      const students: Student[] = (data || []).map((est: EstudianteDB) => {
        const nivelData = nivelDataMap[est.id_estudiante] || { nivel_actual: 0, total_faltas_60_dias: 0 };
        return {
          id: est.id_estudiante,
          fullName: est.nombre_completo,
          grade: est.grado,
          section: est.seccion,
          level: est.nivel_educativo as EducationalLevel,
          barcode: est.codigo_barras,
          profilePhoto: est.foto_perfil,
          active: est.activo,
          reincidenceLevel: nivelData.nivel_actual as any,
          faultsLast60Days: nivelData.total_faltas_60_dias,
        };
      });

      return { students, error: null };
    } catch (error: any) {
      console.error('Error en getAll:', error);
      return { students: [], error: error.message || 'Error al obtener estudiantes' };
    }
  },

  /**
   * Obtener estudiante por ID con información completa (nivel de reincidencia)
   */
  async getById(id: number): Promise<{ student: Student | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('id_estudiante', id)
        .single();

      if (error || !data) {
        return { student: null, error: 'Estudiante no encontrado' };
      }

      // Obtener nivel de reincidencia usando la vista
      const { data: nivelData } = await supabase
        .from('v_estudiantes_nivel_actual')
        .select('nivel_actual, total_faltas_60_dias, ultima_falta')
        .eq('id_estudiante', data.id_estudiante)
        .single();

      const student: Student = {
        id: data.id_estudiante,
        fullName: data.nombre_completo,
        grade: data.grado,
        section: data.seccion,
        level: data.nivel_educativo as EducationalLevel,
        barcode: data.codigo_barras,
        profilePhoto: data.foto_perfil,
        reincidenceLevel: (nivelData?.nivel_actual || 0) as any,
        faultsLast60Days: nivelData?.total_faltas_60_dias || 0,
        active: data.activo,
      };

      return { student, error: null };
    } catch (error: any) {
      console.error('Error en getById:', error);
      return { student: null, error: error.message || 'Error al obtener estudiante' };
    }
  },

  /**
   * Crear nuevo estudiante
   */
  async create(student: {
    codigo_barras: string;
    nombre_completo: string;
    grado: string;
    seccion: string;
    nivel_educativo: EducationalLevel;
    foto_perfil?: string;
  }): Promise<{ student: Student | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .insert(student)
        .select()
        .single();

      if (error) {
        return { student: null, error: error.message };
      }

      const newStudent: Student = {
        id: data.id_estudiante,
        fullName: data.nombre_completo,
        grade: data.grado,
        section: data.seccion,
        level: data.nivel_educativo as EducationalLevel,
        barcode: data.codigo_barras,
        profilePhoto: data.foto_perfil,
        active: data.activo,
      };

      return { student: newStudent, error: null };
    } catch (error: any) {
      console.error('Error en create:', error);
      return { student: null, error: error.message || 'Error al crear estudiante' };
    }
  },

  /**
   * Actualizar estudiante
   */
  async update(
    id: number,
    updates: Partial<{
      nombre_completo: string;
      grado: string;
      seccion: string;
      nivel_educativo: EducationalLevel;
      foto_perfil: string;
      activo: boolean;
    }>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('estudiantes')
        .update(updates)
        .eq('id_estudiante', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error en update:', error);
      return { success: false, error: error.message || 'Error al actualizar estudiante' };
    }
  },
};
