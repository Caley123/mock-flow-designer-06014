import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/services';
import { toast } from 'sonner';

interface ParentLayoutProps {
  children: ReactNode;
}

/** Layout simple para apoderados: sin menú lateral de personal */
export function ParentLayout({ children }: ParentLayoutProps) {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Sesión cerrada');
    navigate('/login', { replace: true });
  };

  return (
    <div className="parent-shell min-h-screen bg-[hsl(var(--background))]">
      <header className="parent-shell__header sticky top-0 z-30 border-b border-primary/20 bg-gradient-to-r from-primary/12 via-card/96 to-accent/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
              <img src="/favicon.svg" alt="" className="h-7 w-7 shrink-0" width={28} height={28} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                Portal familiar
              </p>
              <p className="truncate text-sm font-semibold text-foreground/95">
                {user?.fullName ?? 'Apoderado'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 rounded-full border-primary/25 bg-card/75 hover:bg-primary/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      <main className="parent-shell__main mx-auto w-full max-w-3xl px-4 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-8">
        {children}
      </main>
    </div>
  );
}
