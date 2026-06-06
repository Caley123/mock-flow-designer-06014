import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentsService } from '@/lib/services';
import { queryKeys } from '@/lib/query/queryKeys';
import type { EducationalLevel } from '@/types';

export interface IncidentsListFilters {
  nivelEducativo?: EducationalLevel;
}

export function useIncidentsQuery(filters: IncidentsListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.list(filters),
    queryFn: async () => {
      const { incidents, error } = await incidentsService.getAll({
        nivelEducativo: filters.nivelEducativo,
      });
      if (error) throw new Error(error);
      return incidents;
    },
  });
}

export function useInvalidateIncidents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
}
