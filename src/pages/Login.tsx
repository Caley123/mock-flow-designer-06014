import { useState, useEffect, useRef, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LogIn, Loader2, User, Lock, School, BookOpen, Calculator, Lightbulb, Globe, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/services';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { useErrorDialog } from '@/hooks/useErrorDialog';

// Componente para los doodles educativos animados
const EducationalDoodles = () => {
  const doodles = useMemo(() => [
    { icon: BookOpen, x: '10%', y: '15%' },
    { icon: Calculator, x: '85%', y: '20%' },
    { icon: Lightbulb, x: '15%', y: '45%' },
    { icon: Globe, x: '80%', y: '50%' },
    { icon: GraduationCap, x: '12%', y: '75%' },
    { icon: School, x: '88%', y: '80%' },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {doodles.map((doodle, index) => {
        const Icon = doodle.icon;
        const floatAnimation = useSpring({
          from: { transform: 'translateY(0px) rotate(0deg)', opacity: 0.25 },
          to: { transform: 'translateY(-15px) rotate(3deg)', opacity: 0.4 },
          config: { duration: 2000 + index * 300 },
          loop: { reverse: true },
        });

        return (
          <animated.div
            key={`doodle-${index}`}
            style={{
              position: 'absolute',
              left: doodle.x,
              top: doodle.y,
              ...floatAnimation,
            }}
            className="text-primary/25"
          >
            <Icon className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1.5} />
          </animated.div>
        );
      })}
      
      {/* Textos educativos decorativos */}
      <div className="absolute inset-0 text-primary/12 font-bold text-xl md:text-2xl">
        <div className="absolute top-[8%] left-[5%] transform -rotate-12">E=mc²</div>
        <div className="absolute top-[25%] right-[8%] transform rotate-12">H₂O</div>
        <div className="absolute top-[60%] left-[3%] transform rotate-6">1+1=2</div>
        <div className="absolute top-[40%] right-[5%] transform -rotate-6">Study</div>
        <div className="absolute bottom-[15%] left-[10%] transform rotate-12">Art</div>
        <div className="absolute bottom-[25%] right-[12%] transform -rotate-12">Concept</div>
        <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 rotate-3">Education</div>
      </div>
    </div>
  );
};

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { errorDialog, showAuthError, closeError } = useErrorDialog();
  const isMountedRef = useRef(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Por favor ingrese usuario y contraseña');
      return;
    }

    if (!isMountedRef.current) return;

    setLoading(true);

    try {
      const { user, error } = await authService.login(username, password);

      if (!isMountedRef.current) return;

      if (error) {
        showAuthError(error || 'Credenciales inválidas. Por favor, verifique su usuario y contraseña.');
        setLoading(false);
        return;
      }

      if (user) {
        toast.success('Inicio de sesión exitoso');
        
        // Guardar "Recuérdame" si está marcado
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        // Verificar si requiere cambio de contraseña
        if (user.cambioPasswordObligatorio) {
          toast.info('Debe cambiar su contraseña');
        }

        navigate('/');
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Error en login:', error);
      showAuthError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Animación para el formulario
  const [mounted, setMounted] = useState(false);
  const formAnimation = useSpring({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
    config: { tension: 300, friction: 30 },
    immediate: !mounted,
  });

  // Efecto para activar la animación al montar y cleanup
  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Sección superior - Header oscuro */}
      <div className="h-[30vh] bg-gradient-to-br from-primary via-primary-dark to-burgundy relative overflow-hidden">
        {/* Patrón decorativo sutil */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white/30 rounded-full"></div>
          <div className="absolute top-20 right-20 w-24 h-24 border-4 border-white/30 rounded-full"></div>
          <div className="absolute bottom-10 left-1/4 w-20 h-20 border-4 border-white/30 rounded-full"></div>
        </div>
        
        <div className="relative z-10 h-full flex items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-2xl">
            Sistema Escolar
          </h1>
        </div>
      </div>

      {/* Sección inferior - Fondo claro con doodles */}
      <div className="flex-1 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 relative">
        <EducationalDoodles />
        
        {/* Card de login centrado */}
        <div className="absolute inset-0 flex items-center justify-center p-4 z-20">
          <animated.div style={formAnimation} className="w-full max-w-md">
            <Card className="bg-white/95 backdrop-blur-md shadow-2xl border-2 border-primary/20 rounded-2xl overflow-hidden">
              <CardContent className="p-8">
                {/* Icono de usuario */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg border-4 border-white">
                    <User className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Título */}
                <h2 className="text-2xl font-bold text-center text-primary mb-2">
                  Inicia sesión
                </h2>
                <p className="text-center text-muted-foreground text-sm mb-6">
                  Accede a tu cuenta para continuar
                </p>

                {/* Formulario */}
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Campo Usuario/Email */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-foreground font-medium">
                      Correo electrónico o matrícula
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ingrese su usuario o correo"
                        autoComplete="username"
                        className="pl-10 h-12 border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Campo Contraseña */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground font-medium">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingrese su contraseña"
                        autoComplete="current-password"
                        className="pl-10 h-12 border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Recuérdame y Olvidé contraseña */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        disabled={loading}
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm font-normal cursor-pointer text-muted-foreground"
                      >
                        Recuérdame
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary hover:text-primary-dark p-0 h-auto font-medium"
                      onClick={() => toast.info('Contacte al administrador del sistema para recuperar su contraseña')}
                      disabled={loading}
                    >
                      ¿Olvidaste la contraseña?
                    </Button>
                  </div>

                  {/* Botón de login */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary via-primary-dark to-primary hover:from-primary-dark hover:via-primary hover:to-primary-dark text-white font-bold py-6 text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span key="loading" className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Iniciando sesión...
                      </span>
                    ) : (
                      <span key="idle" className="flex items-center justify-center">
                        <LogIn className="mr-2 h-5 w-5" />
                        Entrar
                      </span>
                    )}
                  </Button>
                </form>

                {/* Footer del card */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-center text-xs text-muted-foreground">
                    Sistema protegido • Colegio San Ramón 2024
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Información de usuarios de prueba (solo en desarrollo) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-primary/20">
                <p className="text-xs text-center text-muted-foreground">
                  Usuarios de prueba: supervisor1, tutor1, director, admin
                </p>
              </div>
            )}
          </animated.div>
        </div>
      </div>

      {/* Diálogo de error */}
      <ErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => !open && closeError()}
        title={errorDialog.title}
        message={errorDialog.message}
        buttonText="OK"
        variant={errorDialog.variant}
      />
    </div>
  );
};
