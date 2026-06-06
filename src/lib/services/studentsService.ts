import { supabase } from '../supabaseClient';
import { Student, EstudianteDB, EducationalLevel } from '@/types';
import { resolveStudentProfilePhotoUrl } from '@/lib/utils/profilePhoto';
import { getCached, setCached, invalidateCache } from '@/lib/utils/memoryCache';

const SCANNER_BARCODE_INDEX_KEY = 'students:scanner-barcode-index';
const SCANNER_BARCODE_INDEX_TTL = 10 * 60 * 1000;

const SCANNER_SELECT =
  'id_estudiante, nombre_completo, grado, seccion, nivel_educativo, codigo_barras, foto_perfil, activo, telefono_contacto, telefono_emergencia';

let scannerIndexPromise: Promise<Map<string, Student>> | null = null;

function mapScannerRow(data: EstudianteDB): Student {
  return {
    id: data.id_estudiante,
    fullName: data.nombre_completo,
    grade: data.grado,
    section: data.seccion,
    level: data.nivel_educativo as EducationalLevel,
    barcode: data.codigo_barras,
    profilePhoto: mapProfilePhoto(data.foto_perfil),
    reincidenceLevel: 0,
    faultsLast60Days: 0,
    active: data.activo,
    contactPhone: data.telefono_contacto || null,
    emergencyPhone: data.telefono_emergencia || null,
  };
}

function mapProfilePhoto(raw: string | null | undefined): string | null | undefined {
  const resolved = resolveStudentProfilePhotoUrl(raw);
  return resolved ?? raw ?? null;
}

/**
 * Servicio de estudiantes
 */
export const studentsService = {
  /**
   * Índice en memoria de carnets activos para escaneo instantáneo (tutor).
   */
  async prefetchBarcodeIndex(): Promise<Map<string, Student>> {
    const cached = getCached<Map<string, Student>>(SCANNER_BARCODE_INDEX_KEY);
    if (cached) return cached;

    if (!scannerIndexPromise) {
      scannerIndexPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('estudiantes')
            .select(SCANNER_SELECT)
            .eq('activo', true);

          if (error) throw error;

          const map = new Map<string, Student>();
          for (const row of data || []) {
            const code = (row as EstudianteDB).codigo_barras?.trim();
            if (!code) continue;
            map.set(code, mapScannerRow(row as EstudianteDB));
          }

          setCached(SCANNER_BARCODE_INDEX_KEY, map, SCANNER_BARCODE_INDEX_TTL);
          return map;
        } finally {
          scannerIndexPromise = null;
        }
      })();
    }

    return scannerIndexPromise;
  },

  lookupBarcodeInIndex(index: Map<string, Student>, barcode: string): Student | null {
    return index.get(barcode.trim()) ?? null;
  },

  /** Invalida caché tras alta/edición de estudiantes (opcional desde admin). */
  invalidateScannerBarcodeIndex(): void {
    invalidateCache(SCANNER_BARCODE_INDEX_KEY);
  },

  /**
   * Buscar estudiante por código de barras
   */
  async getByBarcode(
    barcode: string,
    options?: { skipReincidence?: boolean }
  ): Promise<{ student: Student | null; error: string | null }> {
    try {
      const columns = options?.skipReincidence
        ? 'id_estudiante, nombre_completo, grado, seccion, nivel_educativo, codigo_barras, foto_perfil, activo, telefono_contacto, telefono_emergencia'
        : '*';

      const { data: rawData, error } = await supabase
        .from('estudiantes')
        .select(columns)
        .eq('codigo_barras', barcode.trim())
        .eq('activo', true)
        .single();

      if (error || !rawData) {
        return { student: null, error: 'Estudiante no encontrado' };
      }
      const data = rawData as any;

      let reincidenceLevel = 0;
      let faultsLast60Days = 0;

      if (!options?.skipReincidence) {
        const { data: nivelData } = await supabase
          .from('v_estudiantes_nivel_actual')
          .select('nivel_actual, total_faltas_60_dias')
          .eq('id_estudiante', data.id_estudiante)
          .single();
        reincidenceLevel = nivelData?.nivel_actual || 0;
        faultsLast60Days = nivelData?.total_faltas_60_dias || 0;
      }

      const student: Student = {
        id: data.id_estudiante,
        fullName: data.nombre_completo,
        grade: data.grado,
        section: data.seccion,
        level: data.nivel_educativo as EducationalLevel,
        barcode: data.codigo_barras,
        profilePhoto: mapProfilePhoto(data.foto_perfil),
        reincidenceLevel: reincidenceLevel as Student['reincidenceLevel'],
        faultsLast60Days,
        active: data.activo,
        contactPhone: data.telefono_contacto || null,
        contactEmail: data.email_contacto || null,
        responsibleName: data.nombre_responsable || null,
        responsibleRelationship: data.parentesco_responsable || null,
        emergencyPhone: data.telefono_emergencia || null,
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
        profilePhoto: mapProfilePhoto(est.foto_perfil),
        active: est.activo,
        contactPhone: est.telefono_contacto || null,
        contactEmail: est.email_contacto || null,
        responsibleName: est.nombre_responsable || null,
        responsibleRelationship: est.parentesco_responsable || null,
        emergencyPhone: est.telefono_emergencia || null,
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
      let studentIds: number[] | undefined = undefined;

      // Si hay búsqueda, hacer consultas separadas para evitar problemas con caracteres especiales
      if (filters?.search) {
        // Escapar caracteres especiales para PostgREST ilike
        // Los caracteres que necesitan escape en ilike: %, _, \
        const escapedSearch = filters.search
          .replace(/\\/g, '\\\\')  // Escapar backslashes primero
          .replace(/%/g, '\\%')    // Escapar %
          .replace(/_/g, '\\_');   // Escapar _
        
        const searchPattern = `%${escapedSearch}%`;
        
        // Hacer dos consultas separadas y combinar resultados para evitar problemas con .or()
        // cuando hay caracteres especiales como comas en el texto de búsqueda
        const [nameResult, barcodeResult] = await Promise.all([
          supabase
            .from('estudiantes')
            .select('id_estudiante')
            .ilike('nombre_completo', searchPattern),
          supabase
            .from('estudiantes')
            .select('id_estudiante')
            .ilike('codigo_barras', searchPattern),
        ]);
        
        const nameIds = (nameResult.data || []).map((r: any) => r.id_estudiante);
        const barcodeIds = (barcodeResult.data || []).map((r: any) => r.id_estudiante);
        studentIds = [...new Set([...nameIds, ...barcodeIds])];
        
        // Si no hay resultados de búsqueda, retornar lista vacía
        if (studentIds.length === 0) {
          return { students: [], error: null };
        }
      }

      // Construir la consulta principal
      let query = supabase
        .from('estudiantes')
        .select('*');

      // Aplicar filtro de IDs si hay búsqueda
      if (studentIds) {
        query = query.in('id_estudiante', studentIds);
      }

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

      const { data, error } = await query.order('nombre_completo', { ascending: true });

      if (error) {
        return { students: [], error: error.message };
      }

      // Obtener niveles de reincidencia para todos los estudiantes desde la vista
      const allStudentIds = (data || []).map((est: EstudianteDB) => est.id_estudiante);
      
      let nivelDataMap: Record<number, { nivel_actual: number; total_faltas_60_dias: number }> = {};
      
      if (allStudentIds.length > 0) {
        // Consultar la vista para obtener los niveles
        const { data: nivelesData } = await supabase
          .from('v_estudiantes_nivel_actual')
          .select('id_estudiante, nivel_actual, total_faltas_60_dias')
          .in('id_estudiante', allStudentIds);
        
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
          profilePhoto: mapProfilePhoto(est.foto_perfil),
          active: est.activo,
          reincidenceLevel: nivelData.nivel_actual as any,
          faultsLast60Days: nivelData.total_faltas_60_dias,
          contactPhone: est.telefono_contacto || null,
          contactEmail: est.email_contacto || null,
          responsibleName: est.nombre_responsable || null,
          responsibleRelationship: est.parentesco_responsable || null,
          emergencyPhone: est.telefono_emergencia || null,
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
        profilePhoto: mapProfilePhoto(data.foto_perfil),
        reincidenceLevel: (nivelData?.nivel_actual || 0) as any,
        faultsLast60Days: nivelData?.total_faltas_60_dias || 0,
        active: data.activo,
        contactPhone: data.telefono_contacto || null,
        contactEmail: data.email_contacto || null,
        responsibleName: data.nombre_responsable || null,
        responsibleRelationship: data.parentesco_responsable || null,
        emergencyPhone: data.telefono_emergencia || null,
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
    telefono_contacto?: string;
    email_contacto?: string;
    nombre_responsable?: string;
    parentesco_responsable?: string;
    telefono_emergencia?: string;
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
        profilePhoto: mapProfilePhoto(data.foto_perfil),
        active: data.activo,
        contactPhone: data.telefono_contacto || null,
        contactEmail: data.email_contacto || null,
        responsibleName: data.nombre_responsable || null,
        responsibleRelationship: data.parentesco_responsable || null,
        emergencyPhone: data.telefono_emergencia || null,
      };

      return { student: newStudent, error: null };
    } catch (error: any) {
      console.error('Error en create:', error);
      return { student: null, error: error.message || 'Error al crear estudiante' };
    }
  },

  /**
   * Subir foto de perfil al bucket fotos-perfil
   */
  async uploadProfilePhoto(file: File): Promise<{ url: string | null; error: string | null }> {
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const normalizedMime =
        file.type === 'image/jpg' || (ext === 'jpg' && !file.type) ? 'image/jpeg' : file.type;

      if (!normalizedMime.match(/^image\/(jpeg|png)$/)) {
        return { url: null, error: 'Solo se permiten archivos JPG o PNG' };
      }

      if (file.size > 5242880) {
        return { url: null, error: 'El archivo no puede superar los 5MB' };
      }

      const fileName = `${Date.now()}.${ext || 'jpg'}`;
      const filePath = `profile/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos-perfil')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: normalizedMime,
        });

      if (uploadError) {
        console.error('Error al subir foto de perfil:', uploadError);
        return { url: null, error: uploadError.message };
      }

      const { data: urlData } = supabase.storage.from('fotos-perfil').getPublicUrl(filePath);
      return { url: urlData.publicUrl, error: null };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al subir foto';
      console.error('Error en uploadProfilePhoto:', error);
      return { url: null, error: message };
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
      telefono_contacto?: string;
      email_contacto?: string;
      nombre_responsable?: string;
      parentesco_responsable?: string;
      telefono_emergencia?: string;
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
