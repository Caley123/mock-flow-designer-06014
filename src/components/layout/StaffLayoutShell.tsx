import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from './Layout';
import { PageLoader } from '@/components/ui/page-loader';

interface StaffLayoutShellProps {
  requiredRole?: string[];
}

/** Layout staff con sidebar visible mientras el chunk de la página carga. */
export function StaffLayoutShell({ requiredRole }: StaffLayoutShellProps) {
  return (
    <Layout requiredRole={requiredRole}>
      <Suspense fallback={<PageLoader message="Cargando…" />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}
