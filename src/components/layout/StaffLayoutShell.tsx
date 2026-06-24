import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from './Layout';
import { PageLoader } from '@/components/ui/page-loader';
import { faultsService } from '@/lib/services';
import { queryKeys } from '@/lib/query/queryKeys';

interface StaffLayoutShellProps {
  requiredRole?: string[];
}

/** Layout staff con sidebar visible mientras el chunk de la página carga. */
export function StaffLayoutShell({ requiredRole }: StaffLayoutShellProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.faults.list(true),
      queryFn: async () => {
        const { faults, error } = await faultsService.getAll(true);
        if (error) throw new Error(error);
        return faults;
      },
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  return (
    <Layout requiredRole={requiredRole}>
      <Suspense fallback={<PageLoader message="Cargando…" />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}
