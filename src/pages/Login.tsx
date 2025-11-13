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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A8A] to-[#800020] p-4">
      <animated.div style={formAnimation} className="w-full">
        <Card className="w-full max-w-md mx-auto border-2 border-[#D4AF37] shadow-xl overflow-hidden">
          <CardHeader className="bg-[#1E3A8A] text-white py-6 px-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-2 shadow-lg">
                <FileText className="w-12 h-12 text-[#800020]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Colegio San Ramón</h1>
              <p className="text-blue-100 mt-2">Sistema de Control de Incidencias</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-gray-700">Usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    autoComplete="username"
                    className="border-gray-300 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                    className="border-gray-300 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>
              </div>
              
              <animated.div 
                style={buttonHover}
                onMouseEnter={() => buttonHover.scale.start(1.02)}
                onMouseLeave={() => buttonHover.scale.start(1)}
              >
                <Button 
                  type="submit" 
                  className="w-full bg-[#800020] hover:bg-[#A00030] text-white border border-[#D4AF37] hover:border-[#D4AF37] transition-all duration-200 shadow-md"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Iniciar Sesión
                    </>
                  )}
                </Button>
              </animated.div>
            </form>
            <div className="mt-6 text-center">
              <Button 
                variant="link" 
                className="text-sm text-[#1E3A8A] hover:text-[#800020]"
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
