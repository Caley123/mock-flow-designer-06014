/** Metadatos SEO centralizados — branding por colegio vía VITE_SCHOOL_NAME. */

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') || '';
const SCHOOL_FROM_ENV = (import.meta.env.VITE_SCHOOL_NAME as string | undefined)?.trim() || '';

export const SITE_URL = APP_URL || 'https://asiscole.com';

/** Imagen única para vista previa de enlaces en WhatsApp (JPEG ligero, no SVG). */
export const WHATSAPP_PREVIEW_VERSION = '1';
export const WHATSAPP_PREVIEW_IMAGE = `${SITE_URL}/whatsapp-preview.jpg?v=${WHATSAPP_PREVIEW_VERSION}`;

/** @deprecated Usar WHATSAPP_PREVIEW_IMAGE — se mantiene por compatibilidad. */
export const OG_IMAGE_URL = WHATSAPP_PREVIEW_IMAGE;

export const SITE_NAME = 'SIE Asiscole';

/** Nombre del colegio (JP: Colegio Jean Piaget; SR: Institución Educativa San Ramón). */
export const SCHOOL_NAME = SCHOOL_FROM_ENV || 'Institución Educativa San Ramón';

/** Nombre corto para UI compacta. */
export const SCHOOL_SHORT = SCHOOL_NAME.includes('Jean Piaget')
  ? 'Jean Piaget'
  : SCHOOL_NAME.includes('San Ramón')
    ? 'San Ramón'
    : SCHOOL_NAME;

export const DEFAULT_TITLE =
  `SIE Asiscole | Sistema de Incidencias y Asistencia Escolar — ${SCHOOL_NAME}`;

export const DEFAULT_DESCRIPTION =
  `Plataforma web para gestión de incidencias disciplinarias, control de asistencia escolar, registro por código de barras, semáforo de reincidencia y reportes para ${SCHOOL_NAME}.`;

export const DEFAULT_KEYWORDS =
  `incidencias escolares, asistencia escolar, control de faltas, ${SCHOOL_NAME}, Asiscole, SIE, gestión educativa, portal padres`;

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  noindex?: boolean;
}

export const PUBLIC_ROUTE_META: Record<string, PageMeta> = {
  '/login': {
    title: `Iniciar sesión | SIE Asiscole — ${SCHOOL_NAME}`,
    description: `Acceso seguro al Sistema de Incidencias Escolares (SIE) para personal docente, tutores y administración de ${SCHOOL_NAME}.`,
    canonical: `${SITE_URL}/login`,
  },
  '/portal-padres': {
    title: `Portal de padres | Consulta de asistencia — ${SCHOOL_NAME}`,
    description: `Consulte la asistencia diaria de su hijo o hija en ${SCHOOL_NAME} ingresando el DNI del estudiante.`,
    canonical: `${SITE_URL}/portal-padres`,
  },
};

export const ARRIVAL_ROUTE_META: PageMeta = {
  title: `Consulta de asistencia | ${SCHOOL_NAME} — Asiscole`,
  description: `Registro de llegada del estudiante. Consulte la asistencia diaria en el Sistema de Incidencias Escolares de ${SCHOOL_NAME}.`,
  canonical: `${SITE_URL}/portal-padres`,
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
  '/departure-control',
  '/parent-meetings',
  '/parent-portal',
  '/justify-faults',
];
