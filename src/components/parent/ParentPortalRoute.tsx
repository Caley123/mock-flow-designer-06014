import { Layout } from '@/components/layout/Layout';
import { ParentPortalProvider } from '@/contexts/ParentPortalContext';
import { ParentPortal } from '@/pages/ParentPortal';

/** Portal familiar con barra lateral (hijos + secciones en el menú) */
export function ParentPortalRoute() {
  return (
    <ParentPortalProvider>
      <Layout>
        <ParentPortal />
      </Layout>
    </ParentPortalProvider>
  );
}
