export const COLORS = {
  // Azul corporativo — equilibrio entre sobrio y vivo
  primary: 'hsl(217, 52%, 42%)',
  secondary: 'hsl(217, 42%, 48%)',
  accent: 'hsl(262, 40%, 50%)',

  primaryLight: 'hsl(217, 45%, 93%)',
  primaryDark: 'hsl(217, 55%, 32%)',
  secondaryLight: 'hsl(217, 40%, 58%)',
  secondaryDark: 'hsl(217, 48%, 30%)',

  accentLight: 'hsl(262, 30%, 62%)',
  accentDark: 'hsl(262, 32%, 38%)',

  white: 'hsl(0, 0%, 100%)',
  offWhite: 'hsl(240, 5%, 98%)',
  lightGray: 'hsl(240, 7%, 91%)',
  mediumGray: 'hsl(0, 0%, 60%)',
  darkGray: 'hsl(240, 4%, 25%)',
  black: 'hsl(0, 0%, 0%)',

  cream: 'hsl(240, 5%, 96%)',
  beige: 'hsl(220, 14%, 92%)',
  warmGray: 'hsl(240, 6%, 94%)',
  sand: 'hsl(240, 5%, 98%)',

  success: 'hsl(152, 48%, 38%)',
  warning: 'hsl(32, 85%, 46%)',
  error: 'hsl(0, 65%, 48%)',
  info: 'hsl(217, 48%, 46%)',

  background: 'hsl(240, 5%, 96%)',
  backgroundAlt: 'hsl(220, 14%, 92%)',
  backgroundWarm: 'hsl(240, 6%, 94%)',
  paper: 'hsl(0, 0%, 100%)',
  paperAlt: 'hsl(240, 5%, 98%)',

  textPrimary: 'hsl(240, 4%, 12%)',
  textSecondary: 'hsl(0, 0%, 47%)',
  textTertiary: 'hsl(0, 0%, 60%)',
  textOnPrimary: 'hsl(0, 0%, 100%)',
  textOnSecondary: 'hsl(0, 0%, 100%)',
  textOnAccent: 'hsl(0, 0%, 100%)',

  borderLight: 'hsl(220, 13%, 91%)',
  borderMedium: 'hsl(240, 7%, 85%)',
  borderDark: 'hsl(0, 0%, 60%)',

  shadow: 'none',
  shadowMd: 'none',
  shadowLg: 'none',

  gradientPrimary: 'linear-gradient(135deg, hsl(217, 52%, 42%) 0%, hsl(217, 55%, 32%) 100%)',
  gradientSecondary: 'linear-gradient(135deg, hsl(217, 42%, 48%) 0%, hsl(217, 40%, 58%) 100%)',
  gradientAccent: 'linear-gradient(135deg, hsl(262, 35%, 48%) 0%, hsl(262, 30%, 62%) 100%)',
  gradientWarm: 'linear-gradient(135deg, hsl(240, 5%, 96%) 0%, hsl(220, 14%, 92%) 100%)',
  gradientHero: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 18%) 100%)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  primary10: 'hsla(217, 52%, 42%, 0.1)',
  secondary10: 'hsla(217, 42%, 48%, 0.1)',
  accent10: 'hsla(262, 35%, 48%, 0.08)',
} as const;

export const THEME = {
  colors: COLORS,
  fontFamily: {
    sans: ['Inter', 'Nunito', 'sans-serif'],
    display: ['Nunito', 'Inter', 'sans-serif'],
    mono: ['IBM Plex Mono', 'Menlo', 'monospace'],
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    none: '0px',
    sm: '0.25rem',
    DEFAULT: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '1.75rem',
    card: '1.75rem',
    full: '9999px',
  },
  boxShadow: {
    sm: 'none',
    DEFAULT: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none',
    '2xl': 'none',
    inner: 'none',
    none: 'none',
  },
} as const;
