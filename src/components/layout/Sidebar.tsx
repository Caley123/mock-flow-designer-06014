import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { authService } from '@/lib/services';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ParentSidebarNav } from '@/components/parent/ParentSidebarNav';
import { GuardyMark } from '@/components/brand/GuardyMark';
import {
  getStaffNavDefaultPath,
  getStaffNavItems,
  isStaffNavItemActive,
  type StaffNavItem,
} from '@/config/staffNavigation';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const user = authService.getCurrentUser();

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    try {
      await authService.logout();
      toast.success('Sesión cerrada');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/login', { replace: true });
    }
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedItems(newExpanded);
  };

  const navItems = getStaffNavItems(user?.role);
  const isParentRole = user?.role === 'Padre';

  const isActive = (item: StaffNavItem) => isStaffNavItemActive(location.pathname, item);

  useEffect(() => {
    const group = navItems.find((item) => isStaffNavItemActive(location.pathname, item));
    if (group?.subItems?.length) {
      setExpandedItems((prev) => new Set(prev).add(group.path));
    }
  }, [location.pathname, navItems]);

  return (
    <>
      {!isParentRole && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="fixed left-4 top-4 z-50 border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </>
      )}

      <aside
        className={cn(
          'staff-sidebar fixed left-0 top-0 z-40 flex h-full w-64 flex-col animate-in fade-in slide-in-from-left-2 duration-300',
          'border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl',
          isParentRole
            ? 'hidden md:flex -translate-x-0'
            : mobileMenuOpen
              ? 'translate-x-0'
              : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex w-full justify-center border-b border-sidebar-border px-4 pb-4 pt-4">
          <Link
            to={user?.role === 'Padre' ? '/parent-portal' : '/'}
            className="group flex flex-col items-center justify-center gap-2 text-center"
            onClick={() => setMobileMenuOpen(false)}
          >
            <GuardyMark size="lg" className="transition-transform duration-200 group-hover:scale-105" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-bold leading-none tracking-wide text-sidebar-foreground">
                SIE
              </span>
              <p className="text-[11px] leading-snug text-sidebar-foreground/70">
                Incidencias Escolares
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {user?.role === 'Padre' ? (
            <ParentSidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          ) : null}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.has(item.path);

            if (hasSubItems) {
              const defaultPath = getStaffNavDefaultPath(item);
              const showSubItems = isExpanded || active;
              return (
                <div key={item.path}>
                  <div className="flex items-stretch gap-0.5">
                    <Link
                      to={defaultPath}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex min-w-0 flex-1 items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                        active
                          ? 'border-l-2 border-l-sidebar-primary bg-sidebar-accent pl-[14px] text-sidebar-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          active ? 'text-sidebar-primary' : 'text-sidebar-foreground/55'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                    <button
                      type="button"
                      aria-expanded={showSubItems}
                      aria-label={`Ver opciones de ${item.label}`}
                      onClick={() => toggleExpanded(item.path)}
                      className={cn(
                        'shrink-0 rounded-lg px-2 py-3 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                        active && 'text-sidebar-primary'
                      )}
                    >
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          showSubItems && 'rotate-90'
                        )}
                      />
                    </button>
                  </div>
                  {showSubItems && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-4">
                      {item.subItems?.map((subItem) => {
                        const subActive = location.pathname === subItem.path;
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center rounded-lg px-4 py-2 text-sm transition-all duration-200',
                              subActive
                                ? 'border-l-2 border-l-sidebar-primary bg-sidebar-accent font-medium text-sidebar-foreground'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <ChevronRight className="mr-2 h-3 w-3" />
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  active
                    ? 'border-l-2 border-l-sidebar-primary bg-sidebar-accent pl-[14px] text-sidebar-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    active ? 'text-sidebar-primary' : 'text-sidebar-foreground/55'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <div className="flex items-center space-x-3 rounded-xl border border-sidebar-border bg-sidebar-accent px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.fullName}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/65">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>
    </>
  );
};
