import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { authService } from '@/lib/services';
import { cn } from '@/lib/utils';
import {
  findStaffNavGroup,
  getStaffNavItems,
} from '@/config/staffNavigation';

export function StaffSubnav() {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const navItems = getStaffNavItems(user?.role);
  const group = findStaffNavGroup(location.pathname, navItems);

  if (!group?.subItems?.length) return null;

  const GroupIcon = group.icon;

  return (
    <aside
      className={cn(
        'fixed left-64 top-0 z-30 hidden h-full w-56 flex-col',
        'border-r border-border/80 bg-card/95 shadow-sm backdrop-blur-sm',
        'lg:flex'
      )}
      aria-label={`Submenú de ${group.label}`}
    >
      <div className="border-b border-border/70 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sección
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GroupIcon className="h-4 w-4" aria-hidden />
          </div>
          <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {group.subItems.map((subItem) => {
          const active = location.pathname === subItem.path;
          return (
            <Link
              key={subItem.path}
              to={subItem.path}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <ChevronRight
                className={cn('h-3.5 w-3.5 shrink-0', active && 'text-primary')}
                aria-hidden
              />
              {subItem.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function useStaffSubnavVisible(): boolean {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const navItems = getStaffNavItems(user?.role);
  const group = findStaffNavGroup(location.pathname, navItems);
  return Boolean(group?.subItems?.length);
}
