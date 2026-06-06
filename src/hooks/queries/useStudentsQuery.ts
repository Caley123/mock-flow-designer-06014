import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/lib/services';
import { queryKeys } from '@/lib/query/queryKeys';
import type { EducationalLevel } from '@/types';

export interface StudentsListFilters {
  search?: string;
  level?: EducationalLevel;
}

export function useStudentsQuery(filters: StudentsListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.students.list(filters),
    queryFn: async () => {
      const { students, error } = await studentsService.getAll({
        search: filters.search,
        level: filters.level,
        active: true,
      });
      if (error) throw new Error(error);
      return students;
    },
    placeholderData: keepPreviousData,
  });
}

export function useInvalidateStudents() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
}
