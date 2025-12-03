import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BookOpen, 
  BarChart3,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  Clock,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { authService } from '@/lib/services';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSpring, animated } from '@react-spring/web';

interface NavItem {
  path: string;
  label: string;
  icon: any;
  roles: string[];
  subItems?: { path: string; label: string }[];
}

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const user = authService.getCurrentUser();

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  }, [navigate]);

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    try {
      await authService.logout();
      toast.success('Sesión cerrada');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Asegurar redirección incluso si hay error
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

  const getNavItems = (): NavItem[] => {
    if (user?.role === 'Tutor') {
      return [];
    }

    if (user?.role === 'Padre') {
      return [
        {
          path: '/parent-portal',
          label: 'Portal de Padres',
          icon: User,
          roles: ['Padre'],
        },
      ];
    }

    const allItems: NavItem[] = [
      {
        path: '/',
        label: 'Inicio',
        icon: LayoutDashboard,
        roles: ['Supervisor', 'Director', 'Admin'],
      },
      {
        path: '/arrival-control',
        label: 'Asistencia',
        icon: Clock,
        roles: ['Supervisor', 'Director', 'Admin'],
      },
      {
        path: '/incidents',
        label: 'Incidencias',
        icon: FileText,
        roles: ['Supervisor', 'Director', 'Admin'],
        subItems: [
          { path: '/incidents', label: 'Lista de Incidencias' },
          { path: '/register', label: 'Registrar Incidencia' },
          { path: '/justify-faults', label: 'Justificar Faltas' },
        ],
      },
      {
        path: '/students',
        label: 'Estudiantes',
        icon: Users,
        roles: ['Supervisor', 'Director', 'Admin'],
      },
      {
        path: '/parent-meetings',
        label: 'Citas con Padres',
        icon: CalendarDays,
        roles: ['Supervisor', 'Director', 'Admin'],
      },
      {
        path: '/faults',
        label: 'Catálogos',
        icon: BookOpen,
        roles: ['Director', 'Admin'],
        subItems: [{ path: '/faults', label: 'Catálogo de Faltas' }],
      },
      {
        path: '/reports',
        label: 'Reportes',
        icon: BarChart3,
        roles: ['Supervisor', 'Director', 'Admin'],
        subItems: [
          { path: '/reports', label: 'Reportes de Incidencias' },
          { path: '/attendance-report', label: 'Reporte de Asistencias' },
        ],
      },
      {
        path: '/system-config',
        label: 'Administración',
        icon: Settings,
        roles: ['Admin'],
        subItems: [
          { path: '/audit', label: 'Auditoría' },
          { path: '/system-config', label: 'Configuración' },
        ],
      },
    ];

    return allItems.filter(item => item.roles.includes(user?.role || ''));
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    const item = navItems.find(item => item.path === path);
    return item?.subItems?.some(sub => location.pathname === sub.path) || false;
  };

  const sidebarAnimation = useSpring({
    from: { opacity: 0, transform: 'translateX(-20px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    config: { tension: 300, friction: 30 }
  });

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden bg-white shadow-md"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <animated.aside
        style={sidebarAnimation}
        className={cn(
          'fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 transition-transform duration-300',
          'w-64 flex flex-col',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-gray-900 font-bold text-lg">Sistema Escolar</span>
              <p className="text-xs text-gray-500">Gestión de Incidencias</p>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.has(item.path);

            if (hasSubItems) {
              return (
                <div key={item.path}>
                  <button
                    onClick={() => toggleExpanded(item.path)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200',
                      'text-sm font-medium',
                      active
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-gray-500')} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        isExpanded && 'rotate-90',
                        active ? 'text-blue-600' : 'text-gray-400'
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
                      {item.subItems?.map((subItem) => {
                        const subActive = location.pathname === subItem.path;
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200',
                              subActive
                                ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <ChevronRight className="w-3 h-3 mr-2" />
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
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium',
                  active
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-gray-500')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </animated.aside>
    </>
  );
};

