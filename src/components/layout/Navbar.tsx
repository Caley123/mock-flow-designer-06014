import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BookOpen, 
  BarChart3,
  LogOut,
  Menu
} from 'lucide-react';
import { useState } from 'react';

export const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/register', label: 'Registrar', icon: FileText },
    { path: '/incidents', label: 'Incidencias', icon: FileText },
    { path: '/students', label: 'Estudiantes', icon: Users },
    { path: '/faults', label: 'Catálogo', icon: BookOpen },
    { path: '/reports', label: 'Reportes', icon: BarChart3 },
  ];

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
            <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent ml-4">
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
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
              <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
