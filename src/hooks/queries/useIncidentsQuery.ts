import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentsService } from '@/lib/services';
import { queryKeys } from '@/lib/query/queryKeys';
import { fetchAllPages } from '@/lib/utils/supabasePagination';
import type { EducationalLevel, Incident } from '@/types';

export interface IncidentsListFilters {
  nivelEducativo?: EducationalLevel;
}

export function useIncidentsQuery(filters: IncidentsListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.list(filters),
    queryFn: async () => {
      const { data, error } = await fetchAllPages<Incident>(async (from, to) => {
        const pageSize = to - from + 1;
        const result = await incidentsService.getAll({
          nivelEducativo: filters.nivelEducativo,
          offset: from,
          limit: pageSize,
        });
        return {
          data: result.incidents,
          error: result.error ? { message: result.error, details: '', hint: '', code: '' } : null,
        };
      });
      if (error) throw new Error(error);
      return data;
    },
  });
}

export function useInvalidateIncidents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
}
