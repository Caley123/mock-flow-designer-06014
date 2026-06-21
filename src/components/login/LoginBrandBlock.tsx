import { BRAND_ICON_SVG } from '@/config/brandAssets';

interface LoginBrandBlockProps {
  compact?: boolean;
}

/** Marca Guardy — escudo SIE (SVG en la UI). */
export function LoginBrandBlock({ compact = false }: LoginBrandBlockProps) {
  const rootClass = compact ? 'login-brand login-brand--compact' : 'login-brand';

  return (
    <div className={rootClass}>
      <div className="login-brand__logo-stack">
        <span className="login-brand__logo-halo" aria-hidden />
        <div className="login-brand__logo-clip" data-login-brand-mark>
          <img
            src={BRAND_ICON_SVG}
            alt="Guardy"
            className="login-brand__logo"
            draggable={false}
          />
        </div>
      </div>
      {!compact && (
        <p className="login-brand__caption" data-login-brand-line>
          Sistema de incidencias escolares
        </p>
      )}
    </div>
  );
}
