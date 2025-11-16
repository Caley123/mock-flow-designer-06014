import { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/services';

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Por favor ingrese usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      const { user, error } = await authService.login(username, password);

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }

      if (user) {
        toast.success('Inicio de sesión exitoso');
        
        // Verificar si requiere cambio de contraseña
        if (user.cambioPasswordObligatorio) {
          // TODO: Redirigir a página de cambio de contraseña
          toast.info('Debe cambiar su contraseña');
        }

        navigate('/');
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      toast.error('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Animación para el formulario
  const [mounted, setMounted] = useState(false);
  const formAnimation = useSpring({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    config: { tension: 300, friction: 30 }
  });

  // Efecto para activar la animación al montar
  useEffect(() => {
    setMounted(true);
  }, []);

  // Animación del botón
  const buttonHover = useSpring({
    scale: 1,
    from: { scale: 0.98 },
    config: { tension: 300, friction: 10 }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream via-sand to-beige p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
      </div>
      
      <animated.div style={formAnimation} className="w-full relative z-10">
        <Card className="w-full max-w-md mx-auto border-2 border-accent shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-br from-primary via-primary-dark to-primary py-8 px-6 text-center relative overflow-hidden">
            {/* Patrón decorativo */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 border-4 border-accent rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 border-4 border-accent rounded-full translate-y-12 -translate-x-12"></div>
            </div>
            
            <div className="flex justify-center mb-4 relative">
              <div className="w-24 h-24 bg-gradient-to-br from-white to-cream rounded-full flex items-center justify-center p-3 shadow-xl border-4 border-accent/30">
                <FileText className="w-14 h-14 text-primary" />
              </div>
            </div>
            <div className="relative">
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">Colegio San Ramón</h1>
              <p className="text-accent-light mt-2 font-medium text-lg">Sistema de Control de Incidencias</p>
              <p className="text-white/80 text-sm mt-1">60 años de excelencia educativa</p>
            </div>
          </CardHeader>
          <CardContent className="p-8 bg-gradient-to-b from-white to-cream/30">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground font-semibold">Usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    autoComplete="username"
                    className="border-warm-gray focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-semibold">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                    className="border-warm-gray focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white h-12"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary via-primary-dark to-primary hover:from-primary-dark hover:to-primary text-white font-bold py-4 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] border-2 border-accent/20"
              >
                <span className="flex items-center justify-center">
                  <Loader2
                    className={`mr-2 h-5 w-5 animate-spin transition-opacity ${loading ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <LogIn
                    className={`mr-2 h-5 w-5 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
                  />
                  <span className="ml-1">
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </span>
                </span>
              </Button>
              
              <div className="pt-4 border-t border-warm-gray/30">
                <p className="text-center text-sm text-muted">
                  Sistema protegido • San Ramón 2024
                </p>
              </div>
            </form>
            <div className="mt-4 text-center">
              <Button 
                variant="link" 
                className="text-sm text-primary hover:text-accent font-medium"
                onClick={() => toast.info('Contacte al administrador del sistema')}
              >
                ¿Olvidó su contraseña?
              </Button>
            </div>
          </CardContent>
        </Card>
      </animated.div>
      <div className="mt-6 pt-6 border-t">
        <p className="text-xs text-center text-muted-foreground">
          Usuarios de prueba: supervisor1, tutor1, director, admin
        </p>
      </div>
    </div>
  );
};
