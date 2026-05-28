import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authService } from '@/lib/services';
import { useParentPortalOptional } from '@/contexts/ParentPortalContext';
import { toast } from 'sonner';

export function ParentMobileHeader() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const ctx = useParentPortalOptional();

  if (user?.role !== 'Padre') {
    return null;
  }

  const childCount = ctx?.students.length ?? 0;
  const childBadge =
    childCount === 0 ? null : childCount === 1 ? '1 alumno' : `${childCount} alumnos`;

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Sesión cerrada');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="parent-mobile-header sticky top-0 z-30 bg-card/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <img src="/favicon.svg" alt="" className="h-7 w-7" width={28} height={28} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-foreground">Portal familiar</h1>
            {childBadge ? (
              <Badge
                variant={childCount > 1 ? 'default' : 'secondary'}
                className="h-5 shrink-0 px-2 text-[10px] font-semibold"
              >
                {childBadge}
              </Badge>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">Sistema de Incidencias Escolares</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl border-border/80"
          onClick={() => void handleLogout()}
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
