import { supabase } from '../supabaseClient';
import { DashboardStats, EducationalLevel } from '@/types';

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
      // Obtener datos de la vista ejecutiva
      const { data: executiveData, error: executiveError } = await supabase
        .from('v_dashboard_ejecutivo')
        .select('*')
        .single();

      if (executiveError) {
        console.error('Error al obtener datos ejecutivos:', executiveError);
      }

      // Calcular fechas de filtro
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

      // Obtener incidencias de hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      let todayQuery = supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'Activa')
        .gte('fecha_hora_registro', hoy.toISOString());
      
      const { count: todayCount } = await todayQuery;

      // Obtener incidencias de esta semana
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo de esta semana
      const { count: weekCount } = await supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'Activa')
        .gte('fecha_hora_registro', inicioSemana.toISOString());

      // Obtener total de incidencias (con filtros de fecha si aplican)
      let totalQuery = supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'Activa');
      
      if (fechaDesde) {
        totalQuery = totalQuery.gte('fecha_hora_registro', fechaDesde);
      }
      if (fechaHasta) {
        totalQuery = totalQuery.lte('fecha_hora_registro', fechaHasta);
      }
      
      const { count: totalCount } = await totalQuery;

      // Obtener distribución por nivel de reincidencia (con filtros de fecha si aplican)
      let nivelQuery = supabase
        .from('incidencias')
        .select('nivel_reincidencia')
        .eq('estado', 'Activa');
      
      if (fechaDesde) {
        nivelQuery = nivelQuery.gte('fecha_hora_registro', fechaDesde);
      }
      if (fechaHasta) {
        nivelQuery = nivelQuery.lte('fecha_hora_registro', fechaHasta);
      }
      
      const { data: nivelData } = await nivelQuery;

      const levelDistribution = {
        level0: nivelData?.filter(i => i.nivel_reincidencia === 0).length || 0,
        level1: nivelData?.filter(i => i.nivel_reincidencia === 1).length || 0,
        level2: nivelData?.filter(i => i.nivel_reincidencia === 2).length || 0,
        level3: nivelData?.filter(i => i.nivel_reincidencia === 3).length || 0,
        level4: nivelData?.filter(i => i.nivel_reincidencia === 4).length || 0,
        level5: nivelData?.filter(i => i.nivel_reincidencia === 5).length || 0,
      };

      // Obtener incidencias por grado (con filtros de fecha si aplican)
      let gradoQuery = supabase
        .from('incidencias')
        .select(`
          nivel_reincidencia,
          estudiantes:id_estudiante (grado, nivel_educativo)
        `)
        .eq('estado', 'Activa');
      
      if (fechaDesde) {
        gradoQuery = gradoQuery.gte('fecha_hora_registro', fechaDesde);
      }
      if (fechaHasta) {
        gradoQuery = gradoQuery.lte('fecha_hora_registro', fechaHasta);
      }
      
      const { data: incidenciasConGrado } = await gradoQuery;

      const incidentsByGrade: { level: EducationalLevel; grade: string; label: string; count: number }[] = [];
      if (incidenciasConGrado) {
        const gradoCounts: Record<string, { level: EducationalLevel; grade: string; count: number }> = {};
        incidenciasConGrado.forEach((inc: any) => {
          const grado = inc.estudiantes?.grado || 'Sin grado';
          const nivel = (inc.estudiantes?.nivel_educativo || 'Secundaria') as EducationalLevel;
          const key = `${nivel}-${grado}`;
          if (!gradoCounts[key]) {
            gradoCounts[key] = { level: nivel, grade: grado, count: 0 };
          }
          gradoCounts[key].count += 1;
        });

        incidentsByGrade.push(
          ...Object.values(gradoCounts).map((entry) => ({
            ...entry,
            label: `${entry.level} • ${entry.grade}`,
          }))
        );
      }

      // Obtener top faltas (con filtros de fecha si aplican)
      let faltasQuery = supabase
        .from('incidencias')
        .select(`
          catalogos_faltas:id_falta (nombre_falta)
        `)
        .eq('estado', 'Activa');
      
      if (fechaDesde) {
        faltasQuery = faltasQuery.gte('fecha_hora_registro', fechaDesde);
      }
      if (fechaHasta) {
        faltasQuery = faltasQuery.lte('fecha_hora_registro', fechaHasta);
      }
      
      const { data: faltasData } = await faltasQuery;

      const faltasCounts: Record<string, number> = {};
      if (faltasData) {
        faltasData.forEach((inc: any) => {
          const nombreFalta = inc.catalogos_faltas?.nombre_falta || 'Desconocida';
          faltasCounts[nombreFalta] = (faltasCounts[nombreFalta] || 0) + 1;
        });
      }

      const topFaults = Object.entries(faltasCounts)
        .map(([faultType, count]) => ({ faultType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calcular promedio de nivel de reincidencia
      const avgLevel = nivelData && nivelData.length > 0
        ? nivelData.reduce((sum, inc) => sum + inc.nivel_reincidencia, 0) / nivelData.length
        : 0;

      const stats: DashboardStats = {
        totalIncidents: totalCount || 0,
        incidentsToday: todayCount || 0,
        incidentsThisWeek: weekCount || 0,
        incidentsThisMonth: executiveData?.total_incidencias_mes || 0,
        studentsWithIncidents: executiveData?.estudiantes_afectados_mes || 0,
        averageReincidenceLevel: Math.round(avgLevel * 100) / 100,
        levelDistribution: {
          level0: levelDistribution.level0,
          level1: levelDistribution.level1,
          level2: levelDistribution.level2,
          level3: levelDistribution.level3,
          level4: levelDistribution.level4,
        },
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

      // Obtener incidencias agrupadas por mes
      const monthlyTrend: { month: string; incidents: number }[] = [];
      
      for (const { month, year: monthYear, label } of months) {
        const startDate = new Date(monthYear, month, 1);
        const endDate = new Date(monthYear, month + 1, 0, 23, 59, 59, 999);
        
        // Si hay filtros de nivel o grado, necesitamos hacer join con estudiantes
        if (level || grade) {
          const { data, error } = await supabase
            .from('incidencias')
            .select(`
              id_incidencia,
              estudiantes:id_estudiante (nivel_educativo, grado)
            `)
            .eq('estado', 'Activa')
            .gte('fecha_hora_registro', startDate.toISOString())
            .lte('fecha_hora_registro', endDate.toISOString());

          if (error) {
            console.error(`Error al obtener incidencias de ${label}:`, error);
            monthlyTrend.push({ month: label, incidents: 0 });
            continue;
          }

          // Filtrar por nivel y grado si se especificaron
          const filteredData = (data || []).filter((inc: any) => {
            const estudiante = inc.estudiantes;
            if (!estudiante) return false;
            const matchesLevel = !level || estudiante.nivel_educativo === level;
            const matchesGrade = !grade || estudiante.grado === grade;
            return matchesLevel && matchesGrade;
          });

          monthlyTrend.push({ month: label, incidents: filteredData.length });
        } else {
          // Sin filtros, podemos usar count directamente
          const { count, error } = await supabase
            .from('incidencias')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'Activa')
            .gte('fecha_hora_registro', startDate.toISOString())
            .lte('fecha_hora_registro', endDate.toISOString());

          if (error) {
            console.error(`Error al obtener incidencias de ${label}:`, error);
            monthlyTrend.push({ month: label, incidents: 0 });
            continue;
          }

          monthlyTrend.push({ month: label, incidents: count || 0 });
        }
      }

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
        
        // Solo incluir días hábiles (lunes=1 a viernes=5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weekDays.push({
            date,
            label: dayLabels[dayOfWeek],
          });
        }
        daysBack++;
        
        // Prevenir bucle infinito
        if (daysBack > 14) break;
      }
      
      // Ordenar por fecha (más antiguo primero)
      weekDays.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Obtener incidencias por día
      const weeklyData: { day: string; count: number }[] = [];
      
      for (const { date, label } of weekDays) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        // Si hay filtros de nivel o grado, necesitamos hacer join con estudiantes
        if (level || grade) {
          const { data, error } = await supabase
            .from('incidencias')
            .select(`
              id_incidencia,
              estudiantes:id_estudiante (nivel_educativo, grado)
            `)
            .eq('estado', 'Activa')
            .gte('fecha_hora_registro', startDate.toISOString())
            .lte('fecha_hora_registro', endDate.toISOString());

          if (error) {
            console.error(`Error al obtener incidencias de ${label}:`, error);
            weeklyData.push({ day: label, count: 0 });
            continue;
          }

          // Filtrar por nivel y grado si se especificaron
          const filteredData = (data || []).filter((inc: any) => {
            const estudiante = inc.estudiantes;
            if (!estudiante) return false;
            const matchesLevel = !level || estudiante.nivel_educativo === level;
            const matchesGrade = !grade || estudiante.grado === grade;
            return matchesLevel && matchesGrade;
          });

          weeklyData.push({ day: label, count: filteredData.length });
        } else {
          // Sin filtros, podemos usar count directamente
          const { count, error } = await supabase
            .from('incidencias')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'Activa')
            .gte('fecha_hora_registro', startDate.toISOString())
            .lte('fecha_hora_registro', endDate.toISOString());

          if (error) {
            console.error(`Error al obtener incidencias de ${label}:`, error);
            weeklyData.push({ day: label, count: 0 });
            continue;
          }

          weeklyData.push({ day: label, count: count || 0 });
        }
      }

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
