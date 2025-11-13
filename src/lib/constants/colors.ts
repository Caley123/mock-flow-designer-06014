export const COLORS = {
  // Colores principales - Paleta Institucional
  primary: 'hsl(345, 75%, 30%)',      // Vino Tinto/Borgoña - Color de marca principal
  secondary: 'hsl(345, 75%, 30%)',    // Mismo vino tinto para consistencia
  accent: 'hsl(42, 70%, 48%)',        // Dorado/Ocre - Acento institucional
  
  // Variantes del primario (Vino Tinto)
  primaryLight: 'hsl(345, 70%, 45%)',
  primaryDark: 'hsl(345, 80%, 20%)',
  secondaryLight: 'hsl(345, 70%, 45%)',
  secondaryDark: 'hsl(345, 80%, 20%)',
  
  // Variantes del acento (Dorado)
  accentLight: 'hsl(42, 75%, 60%)',
  accentDark: 'hsl(42, 65%, 35%)',
  
  // Neutrales - Blanco y grises (expandidos para más variedad)
  white: 'hsl(0, 0%, 100%)',
  offWhite: 'hsl(40, 25%, 98%)',      // Casi blanco con toque cálido
  lightGray: 'hsl(210, 15%, 96%)',
  mediumGray: 'hsl(210, 10%, 60%)',
  darkGray: 'hsl(210, 10%, 25%)',
  black: 'hsl(210, 10%, 10%)',
  
  // Tonos cálidos complementarios (inspirados en la imagen)
  cream: 'hsl(40, 30%, 95%)',         // Crema suave para fondos
  beige: 'hsl(38, 25%, 88%)',         // Beige cálido
  warmGray: 'hsl(35, 15%, 85%)',      // Gris cálido
  sand: 'hsl(40, 35%, 92%)',          // Arena clara
  
  // Estados del sistema
  success: 'hsl(160, 75%, 42%)',      // Verde esmeralda
  warning: 'hsl(38, 95%, 55%)',       // Naranja/Amarillo
  error: 'hsl(0, 80%, 50%)',          // Rojo fuerte
  info: 'hsl(210, 80%, 55%)',         // Azul informativo
  
  // Fondos (expandidos para más variedad visual)
  background: 'hsl(0, 0%, 100%)',     // Blanco puro
  backgroundAlt: 'hsl(40, 30%, 95%)', // Crema para alternar
  backgroundWarm: 'hsl(38, 25%, 88%)', // Fondo beige cálido
  paper: 'hsl(0, 0%, 100%)',
  paperAlt: 'hsl(40, 25%, 98%)',      // Papel con toque cálido
  
  // Texto
  textPrimary: 'hsl(210, 10%, 10%)',      // Gris oscuro/Negro
  textSecondary: 'hsl(210, 10%, 25%)',    // Gris oscuro
  textTertiary: 'hsl(210, 10%, 60%)',     // Gris medio
  textOnPrimary: 'hsl(0, 0%, 100%)',      // Blanco sobre vino tinto
  textOnSecondary: 'hsl(0, 0%, 100%)',    // Blanco sobre vino tinto
  textOnAccent: 'hsl(210, 10%, 10%)',     // Negro sobre dorado
  
  // Bordes
  borderLight: 'hsl(210, 15%, 90%)',
  borderMedium: 'hsl(210, 15%, 80%)',
  borderDark: 'hsl(210, 10%, 60%)',
  
  // Sombras
  shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  
  // Gradientes institucionales (expandidos)
  gradientPrimary: 'linear-gradient(135deg, hsl(345, 75%, 30%) 0%, hsl(345, 80%, 20%) 100%)',
  gradientSecondary: 'linear-gradient(135deg, hsl(345, 75%, 30%) 0%, hsl(345, 70%, 45%) 100%)',
  gradientAccent: 'linear-gradient(135deg, hsl(42, 65%, 35%) 0%, hsl(42, 75%, 60%) 100%)',
  gradientWarm: 'linear-gradient(135deg, hsl(40, 30%, 95%) 0%, hsl(38, 25%, 88%) 100%)',
  gradientHero: 'linear-gradient(135deg, hsl(345, 75%, 30%) 0%, hsl(345, 80%, 20%) 50%, hsl(42, 65%, 35%) 100%)',
  
  // Transparencias
  overlay: 'rgba(0, 0, 0, 0.5)',
  primary10: 'hsla(345, 75%, 30%, 0.1)',
  secondary10: 'hsla(345, 75%, 30%, 0.1)',
  accent10: 'hsla(42, 70%, 48%, 0.1)'
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
