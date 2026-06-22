import { supabase } from '../supabaseClient';
import { DashboardStats, EducationalLevel } from '@/types';

type IncidentCountFilters = {
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  nivelReincidencia?: number;
  nivelEducativo?: EducationalLevel;
  grado?: string;
};

async function countIncidents(filters: IncidentCountFilters = {}): Promise<number> {
  let query = supabase.from('incidencias').select('id_incidencia', { count: 'exact', head: true });

  if (filters.estado) query = query.eq('estado', filters.estado);
  if (filters.fechaDesde) query = query.gte('fecha_hora_registro', filters.fechaDesde);
  if (filters.fechaHasta) query = query.lte('fecha_hora_registro', filters.fechaHasta);
  if (filters.nivelReincidencia !== undefined) {
    query = query.eq('nivel_reincidencia', filters.nivelReincidencia);
  }
  if (filters.nivelEducativo) {
    query = query.eq('estudiantes.nivel_educativo', filters.nivelEducativo);
  }
  if (filters.grado) {
    query = query.eq('estudiantes.grado', filters.grado);
  }

  const { count, error } = await query;
  if (error) {
    console.error('Error al contar incidencias:', error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Servicio de dashboard y reportes
 */
export const dashboardService = {
  /**
   * Obtener estadísticas del dashboard ejecutivo
   */
  async getDashboardStats(filters?: {
    bimestre?: number;
    añoEscolar?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ stats: DashboardStats | null; error: string | null }> {
    try {
      // 1. Resolver fechas (operación síncrona o import mínimo — NO es red)
      let fechaDesde: string | undefined;
      let fechaHasta: string | undefined;
      if (filters?.bimestre && filters?.añoEscolar) {
        const { getBimestreDates } = await import('@/lib/utils/bimestreUtils');
        const { inicio, fin } = getBimestreDates(filters.bimestre as 1 | 2 | 3 | 4, filters.añoEscolar);
        fechaDesde = inicio.toISOString();
        fechaHasta = fin.toISOString();
      } else if (filters?.startDate && filters?.endDate) {
        fechaDesde = filters.startDate;
        fechaHasta = filters.endDate;
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      const base: IncidentCountFilters = { estado: 'Activa', fechaDesde, fechaHasta };

      // 2. Construir queries de grado y falta con fechas
      let gradoQ = supabase
        .from('incidencias')
        .select('nivel_reincidencia, estudiantes:id_estudiante(grado, nivel_educativo)')
        .eq('estado', 'Activa')
        .limit(600);
      let faltaQ = supabase
        .from('incidencias')
        .select('catalogos_faltas:id_falta(nombre_falta)')
        .eq('estado', 'Activa')
        .limit(600);
      if (fechaDesde) {
        gradoQ = gradoQ.gte('fecha_hora_registro', fechaDesde);
        faltaQ = faltaQ.gte('fecha_hora_registro', fechaDesde);
      }
      if (fechaHasta) {
        gradoQ = gradoQ.lte('fecha_hora_registro', fechaHasta);
        faltaQ = faltaQ.lte('fecha_hora_registro', fechaHasta);
      }

      // 3. TODAS las llamadas de red en un único Promise.all — 0 cascada
      const [
        { data: executiveData },
        todayCount,
        weekCount,
        totalCount,
        lv0, lv1, lv2, lv3, lv4, lv5,
        { data: incidenciasConGrado },
        { data: faltasData },
      ] = await Promise.all([
        supabase.from('v_dashboard_ejecutivo').select('*').single(),
        countIncidents({ estado: 'Activa', fechaDesde: hoy.toISOString() }),
        countIncidents({ estado: 'Activa', fechaDesde: inicioSemana.toISOString() }),
        countIncidents(base),
        countIncidents({ ...base, nivelReincidencia: 0 }),
        countIncidents({ ...base, nivelReincidencia: 1 }),
        countIncidents({ ...base, nivelReincidencia: 2 }),
        countIncidents({ ...base, nivelReincidencia: 3 }),
        countIncidents({ ...base, nivelReincidencia: 4 }),
        countIncidents({ ...base, nivelReincidencia: 5 }),
        gradoQ,
        faltaQ,
      ]);

      // 4. Cómputo local (sin red)
      const levelCounts = [lv0, lv1, lv2, lv3, lv4, lv5];
      const levelDistribution = {
        level0: lv0, level1: lv1, level2: lv2,
        level3: lv3, level4: lv4, level5: lv5,
      };
      const totalForAvg = levelCounts.reduce((s, n) => s + n, 0);
      const avgLevel = totalForAvg > 0
        ? levelCounts.reduce((s, n, i) => s + i * n, 0) / totalForAvg
        : 0;

      const gradoCounts: Record<string, { level: EducationalLevel; grade: string; count: number }> = {};
      (incidenciasConGrado ?? []).forEach((inc: any) => {
        const grado = inc.estudiantes?.grado || 'Sin grado';
        const nivel = (inc.estudiantes?.nivel_educativo || 'Secundaria') as EducationalLevel;
        const key = `${nivel}-${grado}`;
        if (!gradoCounts[key]) gradoCounts[key] = { level: nivel, grade: grado, count: 0 };
        gradoCounts[key].count += 1;
      });
      const incidentsByGrade = Object.values(gradoCounts).map((e) => ({
        ...e,
        label: `${e.level} • ${e.grade}`,
      }));

      const faltasCounts: Record<string, number> = {};
      (faltasData ?? []).forEach((inc: any) => {
        const f = inc.catalogos_faltas?.nombre_falta || 'Desconocida';
        faltasCounts[f] = (faltasCounts[f] || 0) + 1;
      });
      const topFaults = Object.entries(faltasCounts)
        .map(([faultType, count]) => ({ faultType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const stats: DashboardStats = {
        totalIncidents: totalCount || 0,
        incidentsToday: todayCount || 0,
        incidentsThisWeek: weekCount || 0,
        incidentsThisMonth: executiveData?.total_incidencias_mes || 0,
        studentsWithIncidents: executiveData?.estudiantes_afectados_mes || 0,
        averageReincidenceLevel: Math.round(avgLevel * 100) / 100,
        levelDistribution,
        topFaults,
        incidentsByGrade,
      };

      return { stats, error: null };
    } catch (error: any) {
      console.error('Error en getDashboardStats:', error);
      return { stats: null, error: error.message || 'Error al obtener estadísticas' };
    }
  },

  /**
   * Obtener estadísticas por bimestre
   */
  async getBimestralStats(
    bimestre: number,
    añoEscolar: number,
    filters?: {
      level?: EducationalLevel;
      grade?: string;
      section?: string;
    }
  ): Promise<{ stats: DashboardStats | null; error: string | null }> {
    return this.getDashboardStats({
      bimestre,
      añoEscolar,
    });
  },

  /**
   * Obtener tendencia mensual de incidencias (últimos 5 meses)
   */
  async getMonthlyTrend(
    year?: number,
    level?: EducationalLevel,
    grade?: string
  ): Promise<{ monthlyTrend: { month: string; incidents: number }[]; error: string | null }> {
    try {
      const now = new Date();
      const currentYear = year || now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11
      
      // Obtener los últimos 5 meses
      const months: { month: number; year: number; label: string }[] = [];
      for (let i = 4; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthNum = date.getMonth();
        const monthYear = date.getFullYear();
        const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        months.push({
          month: monthNum,
          year: monthYear,
          label: monthLabels[monthNum],
        });
      }

      // Obtener incidencias agrupadas por mes (en paralelo)
      const monthlyTrend = await Promise.all(
        months.map(async ({ month, year: monthYear, label }) => {
          const startDate = new Date(monthYear, month, 1);
          const endDate = new Date(monthYear, month + 1, 0, 23, 59, 59, 999);

          const incidents = await countIncidents({
            estado: 'Activa',
            fechaDesde: startDate.toISOString(),
            fechaHasta: endDate.toISOString(),
            nivelEducativo: level,
            grado: grade,
          });

          return { month: label, incidents };
        }),
      );

      return { monthlyTrend, error: null };
    } catch (error: any) {
      console.error('Error en getMonthlyTrend:', error);
      return { monthlyTrend: [], error: error.message || 'Error al obtener tendencia mensual' };
    }
  },

  /**
   * Obtener datos semanales de incidencias (últimos 5 días hábiles)
   */
  async getWeeklyData(
    level?: EducationalLevel,
    grade?: string
  ): Promise<{ weeklyData: { day: string; count: number }[]; error: string | null }> {
    try {
      const now = new Date();
      const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      // Obtener los últimos 5 días hábiles (lunes a viernes)
      const weekDays: { date: Date; label: string }[] = [];
      let daysBack = 0;
      
      while (weekDays.length < 5) {
        const date = new Date(now);
        date.setDate(now.getDate() - daysBack);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weekDays.push({
            date,
            label: dayLabels[dayOfWeek],
          });
        }
        daysBack++;
        
        if (daysBack > 14) break;
      }
      
      weekDays.sort((a, b) => a.date.getTime() - b.date.getTime());

      const weeklyData = await Promise.all(
        weekDays.map(async ({ date, label }) => {
          const startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);

          const count = await countIncidents({
            estado: 'Activa',
            fechaDesde: startDate.toISOString(),
            fechaHasta: endDate.toISOString(),
            nivelEducativo: level,
            grado: grade,
          });

          return { day: label, count };
        }),
      );

      return { weeklyData, error: null };
    } catch (error: any) {
      console.error('Error en getWeeklyData:', error);
      return { weeklyData: [], error: error.message || 'Error al obtener datos semanales' };
    }
  },

  /**
   * Obtener datos comparativos por grado
   */
  async getComparisonByGrade(
    filters?: {
      level?: EducationalLevel;
      bimestre?: number;
      añoEscolar?: number;
    }
  ): Promise<{ 
    comparison: Array<{
      grade: string;
      level: EducationalLevel;
      label: string;
      totalIncidents: number;
      studentsWithIncidents: number;
      averageReincidence: number;
      levelDistribution: {
        level0: number;
        level1: number;
        level2: number;
        level3: number;
        level4: number;
      };
    }>;
    error: string | null;
  }> {
    try {
      // Calcular fechas de filtro
      let fechaDesde: string | undefined;
      let fechaHasta: string | undefined;
      
      if (filters?.bimestre && filters?.añoEscolar) {
        const { getBimestreDates } = await import('@/lib/utils/bimestreUtils');
        const { inicio, fin } = getBimestreDates(filters.bimestre as 1 | 2 | 3 | 4, filters.añoEscolar);
        fechaDesde = inicio.toISOString();
        fechaHasta = fin.toISOString();
      }

      // Obtener todas las incidencias con información de estudiantes
      let query = supabase
        .from('incidencias')
        .select(`
          id_incidencia,
          nivel_reincidencia,
          estudiantes:id_estudiante (grado, seccion, nivel_educativo)
        `)
        .eq('estado', 'Activa');

      if (fechaDesde) {
        query = query.gte('fecha_hora_registro', fechaDesde);
      }
      if (fechaHasta) {
        query = query.lte('fecha_hora_registro', fechaHasta);
      }

      const { data: incidencias, error } = await query;

      if (error) {
        return { comparison: [], error: error.message };
      }

      // Agrupar por grado y nivel educativo
      const gradeGroups: Record<string, {
        grade: string;
        level: EducationalLevel;
        incidents: any[];
        students: Set<number>;
        nivelReincidencia: number[];
      }> = {};

      (incidencias || []).forEach((inc: any) => {
        const estudiante = inc.estudiantes;
        if (!estudiante) return;

        const nivel = (estudiante.nivel_educativo || 'Secundaria') as EducationalLevel;
        const grado = estudiante.grado || 'Sin grado';

        // Aplicar filtro de nivel si existe
        if (filters?.level && nivel !== filters.level) return;

        const key = `${nivel}-${grado}`;
        if (!gradeGroups[key]) {
          gradeGroups[key] = {
            grade: grado,
            level: nivel,
            incidents: [],
            students: new Set(),
            nivelReincidencia: [],
          };
        }

        gradeGroups[key].incidents.push(inc);
        gradeGroups[key].students.add(inc.estudiantes.id_estudiante);
        gradeGroups[key].nivelReincidencia.push(inc.nivel_reincidencia);
      });

      // Calcular estadísticas por grado
      const comparison = Object.values(gradeGroups).map((group) => {
        const totalIncidents = group.incidents.length;
        const studentsWithIncidents = group.students.size;
        const averageReincidence = group.nivelReincidencia.length > 0
          ? group.nivelReincidencia.reduce((sum, n) => sum + n, 0) / group.nivelReincidencia.length
          : 0;

        const levelDistribution = {
          level0: group.nivelReincidencia.filter(n => n === 0).length,
          level1: group.nivelReincidencia.filter(n => n === 1).length,
          level2: group.nivelReincidencia.filter(n => n === 2).length,
          level3: group.nivelReincidencia.filter(n => n === 3).length,
          level4: group.nivelReincidencia.filter(n => n === 4).length,
        };

        return {
          grade: group.grade,
          level: group.level,
          label: `${group.level} • ${group.grade}`,
          totalIncidents,
          studentsWithIncidents,
          averageReincidence: Math.round(averageReincidence * 100) / 100,
          levelDistribution,
        };
      }).sort((a, b) => {
        // Ordenar por nivel educativo primero, luego por grado
        if (a.level !== b.level) {
          return a.level === 'Primaria' ? -1 : 1;
        }
        return a.grade.localeCompare(b.grade);
      });

      return { comparison, error: null };
    } catch (error: any) {
      console.error('Error en getComparisonByGrade:', error);
      return { comparison: [], error: error.message || 'Error al obtener comparación por grado' };
    }
  },

  /**
   * Obtener datos comparativos por sección
   */
  async getComparisonBySection(
    filters?: {
      level?: EducationalLevel;
      grade?: string;
      bimestre?: number;
      añoEscolar?: number;
    }
  ): Promise<{ 
    comparison: Array<{
      section: string;
      grade: string;
      level: EducationalLevel;
      label: string;
      totalIncidents: number;
      studentsWithIncidents: number;
      averageReincidence: number;
    }>;
    error: string | null;
  }> {
    try {
      // Calcular fechas de filtro
      let fechaDesde: string | undefined;
      let fechaHasta: string | undefined;
      
      if (filters?.bimestre && filters?.añoEscolar) {
        const { getBimestreDates } = await import('@/lib/utils/bimestreUtils');
        const { inicio, fin } = getBimestreDates(filters.bimestre as 1 | 2 | 3 | 4, filters.añoEscolar);
        fechaDesde = inicio.toISOString();
        fechaHasta = fin.toISOString();
      }

      // Obtener todas las incidencias con información de estudiantes
      let query = supabase
        .from('incidencias')
        .select(`
          id_incidencia,
          nivel_reincidencia,
          estudiantes:id_estudiante (grado, seccion, nivel_educativo)
        `)
        .eq('estado', 'Activa');

      if (fechaDesde) {
        query = query.gte('fecha_hora_registro', fechaDesde);
      }
      if (fechaHasta) {
        query = query.lte('fecha_hora_registro', fechaHasta);
      }

      const { data: incidencias, error } = await query;

      if (error) {
        return { comparison: [], error: error.message };
      }

      // Agrupar por sección, grado y nivel educativo
      const sectionGroups: Record<string, {
        section: string;
        grade: string;
        level: EducationalLevel;
        incidents: any[];
        students: Set<number>;
        nivelReincidencia: number[];
      }> = {};

      (incidencias || []).forEach((inc: any) => {
        const estudiante = inc.estudiantes;
        if (!estudiante) return;

        const nivel = (estudiante.nivel_educativo || 'Secundaria') as EducationalLevel;
        const grado = estudiante.grado || 'Sin grado';
        const seccion = estudiante.seccion || 'Sin sección';

        // Aplicar filtros
        if (filters?.level && nivel !== filters.level) return;
        if (filters?.grade && grado !== filters.grade) return;

        const key = `${nivel}-${grado}-${seccion}`;
        if (!sectionGroups[key]) {
          sectionGroups[key] = {
            section: seccion,
            grade: grado,
            level: nivel,
            incidents: [],
            students: new Set(),
            nivelReincidencia: [],
          };
        }

        sectionGroups[key].incidents.push(inc);
        sectionGroups[key].students.add(inc.estudiantes.id_estudiante);
        sectionGroups[key].nivelReincidencia.push(inc.nivel_reincidencia);
      });

      // Calcular estadísticas por sección
      const comparison = Object.values(sectionGroups).map((group) => {
        const totalIncidents = group.incidents.length;
        const studentsWithIncidents = group.students.size;
        const averageReincidence = group.nivelReincidencia.length > 0
          ? group.nivelReincidencia.reduce((sum, n) => sum + n, 0) / group.nivelReincidencia.length
          : 0;

        return {
          section: group.section,
          grade: group.grade,
          level: group.level,
          label: `${group.level} • ${group.grade} ${group.section}`,
          totalIncidents,
          studentsWithIncidents,
          averageReincidence: Math.round(averageReincidence * 100) / 100,
        };
      }).sort((a, b) => {
        // Ordenar por nivel, grado y sección
        if (a.level !== b.level) {
          return a.level === 'Primaria' ? -1 : 1;
        }
        if (a.grade !== b.grade) {
          return a.grade.localeCompare(b.grade);
        }
        return a.section.localeCompare(b.section);
      });

      return { comparison, error: null };
    } catch (error: any) {
      console.error('Error en getComparisonBySection:', error);
      return { comparison: [], error: error.message || 'Error al obtener comparación por sección' };
    }
  },
};
