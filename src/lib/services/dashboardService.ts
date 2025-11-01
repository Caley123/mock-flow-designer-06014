import { supabase } from '../supabaseClient';
import { DashboardStats } from '@/types';

/**
 * Servicio de dashboard y reportes
 */
export const dashboardService = {
  /**
   * Obtener estadísticas del dashboard ejecutivo
   */
  async getDashboardStats(): Promise<{ stats: DashboardStats | null; error: string | null }> {
    try {
      // Obtener datos de la vista ejecutiva
      const { data: executiveData, error: executiveError } = await supabase
        .from('v_dashboard_ejecutivo')
        .select('*')
        .single();

      if (executiveError) {
        console.error('Error al obtener datos ejecutivos:', executiveError);
      }

      // Obtener incidencias de hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'Activa')
        .gte('fecha_hora_registro', hoy.toISOString());

      // Obtener incidencias de esta semana
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo de esta semana
      const { count: weekCount } = await supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'Activa')
        .gte('fecha_hora_registro', inicioSemana.toISOString());

      // Obtener total de incidencias
      const { count: totalCount } = await supabase
        .from('incidencias')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'Activa');

      // Obtener distribución por nivel de reincidencia
      const { data: nivelData } = await supabase
        .from('incidencias')
        .select('nivel_reincidencia')
        .eq('estado', 'Activa');

      const levelDistribution = {
        level0: nivelData?.filter(i => i.nivel_reincidencia === 0).length || 0,
        level1: nivelData?.filter(i => i.nivel_reincidencia === 1).length || 0,
        level2: nivelData?.filter(i => i.nivel_reincidencia === 2).length || 0,
        level3: nivelData?.filter(i => i.nivel_reincidencia === 3).length || 0,
        level4: nivelData?.filter(i => i.nivel_reincidencia === 4).length || 0,
        level5: nivelData?.filter(i => i.nivel_reincidencia === 5).length || 0,
      };

      // Obtener incidencias por grado
      const { data: incidenciasConGrado } = await supabase
        .from('incidencias')
        .select(`
          nivel_reincidencia,
          estudiantes:id_estudiante (grado)
        `)
        .eq('estado', 'Activa');

      const incidentsByGrade: { grade: string; count: number }[] = [];
      if (incidenciasConGrado) {
        const gradoCounts: Record<string, number> = {};
        incidenciasConGrado.forEach((inc: any) => {
          const grado = inc.estudiantes?.grado || 'Sin grado';
          gradoCounts[grado] = (gradoCounts[grado] || 0) + 1;
        });

        incidentsByGrade.push(
          ...Object.entries(gradoCounts).map(([grade, count]) => ({ grade, count }))
        );
      }

      // Obtener top faltas
      const { data: faltasData } = await supabase
        .from('incidencias')
        .select(`
          catalogos_faltas:id_falta (nombre_falta)
        `)
        .eq('estado', 'Activa');

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
};
