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
  User,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { authService } from '@/lib/services';
import { toast } from 'sonner';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const getNavItems = () => {
    // Tutores no tienen acceso al navbar (usan su propia interfaz)
    if (user?.role === 'Tutor') {
      return [];
    }

    const allItems = [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['Supervisor', 'Director', 'Admin'] },
      { path: '/register', label: 'Registrar', icon: FileText, roles: ['Supervisor', 'Director', 'Admin'] },
      { path: '/incidents', label: 'Incidencias', icon: FileText, roles: ['Supervisor', 'Director', 'Admin'] },
      { path: '/students', label: 'Estudiantes', icon: Users, roles: ['Supervisor', 'Director', 'Admin'] },
      { path: '/faults', label: 'Catálogo', icon: BookOpen, roles: ['Director', 'Admin'] },
      { path: '/reports', label: 'Reportes', icon: BarChart3, roles: ['Director', 'Admin'] },
      { path: '/audit', label: 'Auditoría', icon: Shield, roles: ['Admin'] },
    ];

    return allItems.filter(item => item.roles.includes(user?.role || ''));
  };

  const navItems = getNavItems();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-sidebar border-b border-sidebar-border sticky top-0 z-50 backdrop-blur-sm bg-sidebar/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Título */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-primary/25 transition-all duration-300 group-hover:scale-110">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sidebar-foreground font-bold text-xl bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/70 bg-clip-text">
                  Sistema de Incidencias
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1 mr-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={active ? 'default' : 'ghost'}
                      size="sm"
                      className={`
                        relative overflow-hidden transition-all duration-300
                        ${active 
                          ? 'shadow-md' 
                          : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/80'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="relative z-10">{item.label}</span>
                      {active && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground/50" />
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* User Info and Logout */}
            <div className="flex items-center gap-3 pl-4 border-l border-sidebar-border/50">
              <div className="hidden lg:flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="text-sm text-sidebar-foreground">
                  <div className="font-medium">{user?.fullName}</div>
                  <div className="text-xs text-muted-foreground">{user?.role}</div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all duration-300 hover:scale-105"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden xl:inline">Salir</span>
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all duration-300"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col space-y-2 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={active ? 'default' : 'ghost'}
                      size="sm"
                      className={`
                        w-full justify-start transition-all duration-300
                        ${active 
                          ? 'shadow-md' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/80'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              
              {/* Mobile User Section */}
              <div className="px-3 py-4 mt-2 border-t border-sidebar-border/50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm text-sidebar-foreground">
                    <div className="font-medium">{user?.fullName}</div>
                    <div className="text-xs text-muted-foreground">{user?.role}</div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/80 transition-all duration-300"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
