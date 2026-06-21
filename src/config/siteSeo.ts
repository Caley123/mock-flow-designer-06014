/** Metadatos SEO centralizados — asiscole.com / I.E. San Ramón */
export const SITE_URL = 'https://asiscole.com';

export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

export const SITE_NAME = 'SIE Asiscole';

export const SCHOOL_NAME = 'Institución Educativa San Ramón';

export const DEFAULT_TITLE =
  'SIE Asiscole | Sistema de Incidencias y Asistencia Escolar — I.E. San Ramón';

export const DEFAULT_DESCRIPTION =
  'Plataforma web para gestión de incidencias disciplinarias, control de asistencia escolar, registro por código de barras, semáforo de reincidencia y reportes para la I.E. San Ramón.';

export const DEFAULT_KEYWORDS =
  'incidencias escolares, asistencia escolar, control de faltas, I.E. San Ramón, Asiscole, SIE, gestión educativa, portal padres';

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  noindex?: boolean;
}

export const PUBLIC_ROUTE_META: Record<string, PageMeta> = {
  '/login': {
    title: 'Iniciar sesión | SIE Asiscole — I.E. San Ramón',
    description:
      'Acceso seguro al Sistema de Incidencias Escolares (SIE) para personal docente, tutores y administración de la I.E. San Ramón.',
    canonical: `${SITE_URL}/login`,
  },
  '/portal-padres': {
    title: 'Portal de padres | Consulta de asistencia — I.E. San Ramón',
    description:
      'Consulte la asistencia diaria de su hijo o hija en la I.E. San Ramón ingresando el DNI del estudiante.',
    canonical: `${SITE_URL}/portal-padres`,
  },
};

export const DEFAULT_PAGE_META: PageMeta = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  canonical: `${SITE_URL}/`,
};

/** Rutas internas que no deben indexarse (requieren autenticación). */
export const NOINDEX_PREFIXES = [
  '/dashboard',
  '/tutor-scanner',
  '/register',
  '/incidents',
  '/students',
  '/faults',
  '/reports',
  '/attendance-report',
  '/audit',
  '/system-config',
  '/arrival-control',
  '/parent-meetings',
  '/parent-portal',
  '/justify-faults',
];
