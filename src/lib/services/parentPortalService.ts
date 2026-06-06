import { supabase } from '../supabaseClient';
import { Student, User, UserRole } from '@/types';
import { studentsService } from './studentsService';

/** Evita repetir GET a una tabla que no existe (PGRST205). */
let padresEstudiantesTableAvailable: boolean | null = null;

export function parseStudentIdsFromGrados(gradosAsignados: unknown): number[] {
  if (gradosAsignados == null) return [];

  if (typeof gradosAsignados === 'string') {
    try {
      return parseStudentIdsFromGrados(JSON.parse(gradosAsignados));
    } catch {
      return [];
    }
  }

  if (typeof gradosAsignados === 'object' && !Array.isArray(gradosAsignados)) {
    const obj = gradosAsignados as Record<string, unknown>;
    const raw =
      obj.studentIds ?? obj.estudiantes ?? obj.ids ?? obj.id_estudiantes;
    if (Array.isArray(raw)) {
      return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? [n] : [];
    }
  }

  if (Array.isArray(gradosAsignados)) {
    if (gradosAsignados.every((v) => typeof v === 'number')) {
      return gradosAsignados as number[];
    }
    const nums = gradosAsignados.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length > 0) return nums;
  }

  return [];
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    Boolean(error.message?.includes('does not exist')) ||
    Boolean(error.message?.includes('schema cache'))
  );
}

async function fetchStudentIdsFromUsuario(userId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('grados_asignados')
    .eq('id_usuario', userId)
    .maybeSingle();

  if (error) {
    console.warn('usuarios.grados_asignados:', error.message);
    return [];
  }

  return parseStudentIdsFromGrados(data?.grados_asignados);
}

async function fetchFromPadresEstudiantes(userId: number): Promise<Student[]> {
  if (padresEstudiantesTableAvailable === false) return [];

  const { data, error } = await supabase
    .from('padres_estudiantes')
    .select(
      `
      id_estudiante,
      parentesco,
      estudiante:estudiantes (
        id_estudiante,
        codigo_barras,
        nombre_completo,
        grado,
        seccion,
        nivel_educativo,
        foto_perfil,
        activo,
        telefono_contacto,
        telefono_emergencia,
        email_contacto,
        nombre_responsable,
        parentesco_responsable
      )
    `
    )
    .eq('id_usuario', userId);

  if (error) {
    if (isMissingTableError(error)) {
      padresEstudiantesTableAvailable = false;
      return [];
    }
    console.warn('padres_estudiantes:', error.message);
    return [];
  }

  padresEstudiantesTableAvailable = true;

  const students: Student[] = [];
  for (const row of data || []) {
    const est = (row as any).estudiante as Record<string, unknown> | null;
    if (!est || est.activo === false) continue;
    const { student } = await studentsService.getById(Number(est.id_estudiante));
    if (student) students.push(student);
  }
  return students;
}

async function fetchByStudentIds(ids: number[]): Promise<Student[]> {
  const unique = [...new Set(ids)];
  const students: Student[] = [];
  for (const id of unique) {
    const { student } = await studentsService.getById(id);
    if (student?.active) students.push(student);
  }
  return students;
}

async function resolveParentStudentIds(user: User): Promise<number[]> {
  const fromSession = parseStudentIdsFromGrados(user.gradosAsignados);
  if (fromSession.length > 0) return fromSession;
  return fetchStudentIdsFromUsuario(user.id);
}

/**
 * Estudiantes vinculados al usuario (padre o personal en modo prueba).
 *
 * Orden de resolución para Padre:
 * 1. `usuarios.grados_asignados` (JSON studentIds) — no requiere tabla extra
 * 2. `padres_estudiantes` — solo si existe en Supabase
 */
export const parentPortalService = {
  parseStudentIdsFromGrados,

  async getLinkedStudents(user: User): Promise<{ students: Student[]; error: string | null }> {
    try {
      if (user.role === 'Padre') {
        const ids = await resolveParentStudentIds(user);
        if (ids.length > 0) {
          const students = await fetchByStudentIds(ids);
          if (students.length > 0) {
            return { students, error: null };
          }
        }

        const fromTable = await fetchFromPadresEstudiantes(user.id);
        if (fromTable.length > 0) {
          return { students: fromTable, error: null };
        }

        return {
          students: [],
          error:
            ids.length > 0
              ? 'No se pudieron cargar los estudiantes vinculados. Verifique permisos RLS.'
              : 'Su cuenta no está vinculada a ningún estudiante. Contacte a la institución.',
        };
      }

      const staffRoles: UserRole[] = ['Admin', 'Director', 'Supervisor'];
      if (staffRoles.includes(user.role)) {
        const { students } = await studentsService.getAll({ active: true });
        return { students, error: null };
      }

      return { students: [], error: 'No tiene acceso al portal de padres.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar estudiantes';
      return { students: [], error: message };
    }
  },
};
