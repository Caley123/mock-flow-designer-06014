export const COLORS = {
  // Colores principales
  primary: '#1E3A8A',    // Azul marino
  secondary: '#800020',  // Guinda
  accent: '#D4AF37',     // Dorado
  
  // Variantes
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  secondaryLight: '#A00030',
  secondaryDark: '#600015',
  accentLight: '#FCD34D',
  accentDark: '#B7791F',
  
  // Neutrales
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
  mediumGray: '#9CA3AF',
  darkGray: '#4B5563',
  black: '#111827',
  
  // Estados
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Fondo
  background: '#F9FAFB',
  paper: '#FFFFFF',
  
  // Texto
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textOnAccent: '#1F2937',
  
  // Bordes
  borderLight: '#E5E7EB',
  borderMedium: '#D1D5DB',
  borderDark: '#9CA3AF',
  
  // Sombra
  shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  
  // Gradientes
  gradientPrimary: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
  gradientSecondary: 'linear-gradient(135deg, #800020 0%, #A00030 100%)',
  gradientAccent: 'linear-gradient(135deg, #D4AF37 0%, #FCD34D 100%)',
  
  // Transparencias
  overlay: 'rgba(0, 0, 0, 0.5)',
  primary10: 'rgba(30, 58, 138, 0.1)',
  secondary10: 'rgba(128, 0, 32, 0.1)',
  accent10: 'rgba(212, 175, 55, 0.1)'
} as const;

export const THEME = {
  colors: COLORS,
  
  // Tipografía
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['Menlo', 'monospace']
  },
  
  // Espaciado
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem'   // 64px
  },
  
  // Bordes
  borderRadius: {
    none: '0px',
    sm: '0.25rem',  // 4px
    DEFAULT: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px'
  },
  
  // Sombras
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none'
  }
} as const;
