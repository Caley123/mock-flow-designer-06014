import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/services';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { useErrorDialog } from '@/hooks/useErrorDialog';
import { LoginLaptopMockup } from '@/components/login/LoginLaptopMockup';
import { GuardyMark } from '@/components/brand/GuardyMark';

function LoginBrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col items-center gap-2 text-center'
          : 'flex w-full flex-col items-center gap-2 text-center'
      }
    >
      <img
        src="/favicon.svg"
        alt=""
        className={compact ? 'h-9 w-9 object-contain' : 'h-10 w-10 object-contain'}
        width={compact ? 36 : 40}
        height={compact ? 36 : 40}
        draggable={false}
      />
      <div className="flex flex-col items-center gap-0.5">
        <p
          className={
            compact
              ? 'text-lg font-medium text-[var(--color-starlight)]'
              : 'text-xl font-medium tracking-[0.02em] text-[var(--color-starlight)]'
          }
        >
          SIE
        </p>
        <p className="text-xs text-[var(--color-silver)]">
          {compact ? 'Incidencias Escolares' : 'Sistema de Incidencias Escolares'}
        </p>
      </div>
    </div>
  );
}

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { errorDialog, showAuthError, closeError } = useErrorDialog();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        showAuthError(error || 'Credenciales inválidas. Verifique su usuario y contraseña.');
        setLoading(false);
        return;
      }

      if (user) {
        toast.success('Inicio de sesión exitoso');
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        if (user.cambioPasswordObligatorio) {
          toast.info('Debe cambiar su contraseña');
        }
        navigate('/');
      }
    } catch {
      if (!isMountedRef.current) return;
      showAuthError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-page">
      {/* Panel izquierdo — atmósfera Mercury */}
      <aside className="login-hero">
        <div className="login-hero__glow" aria-hidden />
        <div className="login-hero__grid" aria-hidden />

        <div className="relative z-10 w-full pt-1">
          <LoginBrandBlock />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-6">
          <LoginLaptopMockup />
        </div>

        <div className="relative z-10 flex flex-col gap-4 max-w-lg">
          <h2 className="login-hero__title">
            Centro de control
            <br />
            escolar.
          </h2>
          <p className="login-hero__subtitle">
            Incidencias, asistencia y reportes en un entorno enfocado y seguro para tu institución.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Incidencias', 'Asistencia', 'Reportes'].map((tag) => (
              <span key={tag} className="login-hero__tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-[var(--color-silver)]">
          © {new Date().getFullYear()} SIE — Gestión institucional
        </p>
      </aside>

      {/* Panel derecho — formulario */}
      <main className="login-panel">
        <div className="login-card animate-in fade-in duration-500">
          <div className="mb-6 lg:hidden">
            <LoginBrandBlock compact />
          </div>

          <p className="login-eyebrow">Acceso institucional</p>
          <h1 className="login-title">Bienvenido de vuelta</h1>
          <p className="login-subtitle">
            Ingresa tus credenciales para acceder al panel de gestión.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="login-field-label">
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
                className="login-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="login-field-label">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  className="login-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-silver)] hover:text-[var(--color-starlight)] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={loading}
                  className="login-checkbox"
                />
                <Label htmlFor="remember" className="login-remember-label">
                  Mantener sesión
                </Label>
              </div>
              <button
                type="button"
                className="login-link"
                onClick={() =>
                  toast.info('Contacte al administrador para recuperar su contraseña')
                }
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          {process.env.NODE_ENV === 'development' && (
            <p className="login-dev border-t">
              Dev: admin / admin123 · supervisor / supervisor123 · tutor / tutor123
            </p>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-silver)]/70">
            <GuardyMark size="xs" />
            <span>Guardy</span>
          </p>
        </div>
      </main>

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
