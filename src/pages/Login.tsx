import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, ArrowRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { staffNotify } from '@/lib/utils/staffNotify';
import { authService } from '@/lib/services';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { useErrorDialog } from '@/hooks/useErrorDialog';
import { LoginHeroPanel, LoginMobileIntro } from '@/components/login/LoginHeroPanel';
import { LoginCinematicBackdrop } from '@/components/login/LoginCinematicBackdrop';
import { useLoginEnterAnimation } from '@/hooks/useLoginEnterAnimation';
import { useLoginAmbientAnimation } from '@/hooks/useLoginAmbientAnimation';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { errorDialog, showAuthError, closeError } = useErrorDialog();
  const isMountedRef = useRef(true);
  const pageRef = useRef<HTMLDivElement>(null);
  useLoginEnterAnimation(pageRef);
  useLoginAmbientAnimation(pageRef);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('expired') !== 'true') return;
    const role = searchParams.get('role');
    const message =
      role === 'tutor'
        ? 'Sesión del tutor cerrada por inactividad (15 min).'
        : role === 'padre'
          ? 'Sesión del portal familiar cerrada por inactividad (15 min).'
          : 'Su sesión se cerró por inactividad. Vuelva a iniciar sesión.';
    toast.info(message);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Ingrese usuario y contraseña');
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const { user, error } = await authService.login(username, password);

      if (!isMountedRef.current) return;

      if (error) {
        showAuthError(error || 'Credenciales inválidas');
        setLoading(false);
        return;
      }

      if (user) {
        staffNotify.success('¡Bienvenido!', `Hola, ${user.fullName}`);
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        if (user.cambioPasswordObligatorio) {
          toast.info('Debe cambiar su contraseña');
        }
        navigate(user.role === 'Padre' ? '/parent-portal' : '/');
      }
    } catch {
      if (!isMountedRef.current) return;
      showAuthError('Error al iniciar sesión');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-page login-page--minimal" ref={pageRef}>
      <div className="login-iris-reveal" data-login-iris aria-hidden />
      <LoginCinematicBackdrop />

      <LoginHeroPanel />

      <main className="login-panel" data-login-panel-split>
        <div className="login-panel__inner">
          <LoginMobileIntro />

          <div className="login-form-card" data-login-card data-login-anim>
            <div className="login-form-card__line" data-login-card-line aria-hidden />

            <header className="login-form-card__header">
              <h1 className="login-title" data-login-title data-login-anim>
                Entrar
              </h1>
            </header>

            <form onSubmit={handleLogin} className="login-form">
              <div className="login-field-group" data-login-field data-login-anim>
                <Label htmlFor="username" className="sr-only">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  className="login-input"
                  placeholder="Usuario"
                />
              </div>

              <div className="login-field-group" data-login-field data-login-anim>
                <Label htmlFor="password" className="sr-only">Contraseña</Label>
                <div className="login-input-wrap">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="login-input login-input--password"
                    placeholder="Contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="login-password-toggle"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              <div className="login-form__row" data-login-field data-login-anim>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loading}
                    className="login-checkbox"
                  />
                  <Label htmlFor="remember" className="login-remember-label">Recordarme</Label>
                </div>
                <button
                  type="button"
                  className="login-link"
                  onClick={() => toast.info('Contacte al administrador para recuperar su contraseña')}
                  disabled={loading}
                >
                  ¿Olvidó clave?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="login-btn"
                data-login-field
                data-login-anim
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando…</>
                ) : (
                  <>Continuar<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></>
                )}
              </Button>
            </form>

            <Link
              to="/portal-padres"
              className="login-parent-link"
              data-login-field
              data-login-anim
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              Soy padre / apoderado
              <ArrowRight className="h-3.5 w-3.5 ml-auto" aria-hidden />
            </Link>

            <p className="login-form-card__footer">
              <img
                src="/guardy-logo.png"
                alt="Guardy"
                className="login-form-card__footer-logo"
                width={96}
                height={32}
                draggable={false}
              />
            </p>
          </div>
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
