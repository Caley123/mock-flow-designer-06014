import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService, arrivalService, incidentsService } from '@/lib/services';
import { queryKeys } from '@/lib/query/queryKeys';

const DEPARTURE_ALERTS_INTERVAL_MS = 5 * 60 * 1000;
const DASHBOARD_STALE_MS = 2 * 60 * 1000;

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const { stats, error } = await dashboardService.getDashboardStats();
      if (error) throw new Error(error);
      if (!stats) throw new Error('No se recibieron estadísticas del dashboard');
      return stats;
    },
    staleTime: DASHBOARD_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useDepartureAlertsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.departureAlerts(),
    queryFn: async () => {
      const { alerts, error } = await arrivalService.getDepartureAlerts();
      if (error) throw new Error(error);
      return alerts ?? [];
    },
    refetchInterval: DEPARTURE_ALERTS_INTERVAL_MS,
    staleTime: 60 * 1000,
  });
}

export function useRecentIncidentsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.recentIncidents(),
    queryFn: async () => {
      const { incidents, error } = await incidentsService.getAll({ limit: 6, offset: 0 });
      if (error) throw new Error(error);
      return incidents;
    },
    staleTime: 60 * 1000,
  });
}

export function useMonthlyTrendQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.monthlyTrend(),
    queryFn: async () => {
      const { monthlyTrend, error } = await dashboardService.getMonthlyTrend();
      if (error) throw new Error(error);
      return monthlyTrend ?? [];
    },
    staleTime: DASHBOARD_STALE_MS,
    placeholderData: keepPreviousData,
  });
}
