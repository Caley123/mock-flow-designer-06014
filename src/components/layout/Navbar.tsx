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
  User
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
    ];

    return allItems.filter(item => item.roles.includes(user?.role || ''));
  };

  const navItems = getNavItems();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-sidebar border-b border-sidebar-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-sidebar-foreground font-bold text-lg hidden sm:block">
                Sistema de Incidencias
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? 'default' : 'ghost'}
                    size="sm"
                    className={isActive(item.path) ? '' : 'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <div className="flex items-center gap-2 ml-4">
              <div className="text-sm text-sidebar-foreground hidden lg:block">
                <div className="font-medium">{user?.fullName}</div>
                <div className="text-xs text-muted-foreground">{user?.role}</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-sidebar-foreground"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive(item.path) ? 'default' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start ${isActive(item.path) ? '' : 'text-sidebar-foreground'}`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="px-2 py-2 border-t border-sidebar-border">
                <div className="text-sm text-sidebar-foreground mb-2">
                  <div className="font-medium">{user?.fullName}</div>
                  <div className="text-xs text-muted-foreground">{user?.role}</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-sidebar-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
