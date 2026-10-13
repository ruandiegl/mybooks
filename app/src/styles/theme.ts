export const theme = {
  colors: {
    background: '#FFF8F7',
    surface: '#FFFFFF',
    surfaceMuted: '#FFF0F0',
    surfaceStrong: '#F9DCDD',
    foreground: '#271719',
    mutedForeground: '#6F5558',
    primary: '#B90041',
    primaryPressed: '#910031',
    primarySoft: '#FFD9DC',
    secondary: '#7145BA',
    secondaryPressed: '#5829A0',
    secondarySoft: '#ECDCFF',
    outline: '#E3BDC0',
    danger: '#BA1A1A',
    dangerSoft: '#FFDAD6',
    success: '#236B4A',
    successSoft: '#D8F3E6',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onDanger: '#FFFFFF',
    onSuccess: '#FFFFFF',
    viewerBackground: '#271719',
    viewerForeground: '#FFFFFF',
    profileHeroStart: '#271719',
    profileHeroEnd: '#7145BA',
    profileHeroAccent: '#B90041',
    profileHeroScrim: 'rgba(255, 255, 255, 0.78)',
    profileHeroPattern: 'rgba(255, 255, 255, 0.14)',
    profileMetricDivider: '#E3BDC0',
    white: '#FFFFFF',
    black: '#1A1014',
    overlay: 'rgba(39, 23, 25, 0.62)'
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 999
  },
  typography: {
    regular: 'BeVietnamPro_400Regular',
    medium: 'BeVietnamPro_500Medium',
    semibold: 'BeVietnamPro_600SemiBold',
    bold: 'BeVietnamPro_700Bold',
    extraBold: 'BeVietnamPro_800ExtraBold'
  },
  shadow: {
    color: '#3E2C2D',
    opacity: 0.1,
    radius: 16,
    offset: { width: 0, height: 8 },
    elevation: 4
  }
} as const;

export type AppTheme = Omit<typeof theme, 'colors' | 'shadow'> & {
  colors: { [Key in keyof typeof theme.colors]: string };
  shadow: Omit<typeof theme.shadow, 'color'> & { color: string };
};
export const lightTheme: AppTheme = theme;
export const darkTheme: AppTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#181318', surface: '#241B24', surfaceMuted: '#302331', surfaceStrong: '#3B2A3B',
    foreground: '#FFF8F7', mutedForeground: '#CCBAC4',
    primary: '#FF8FB5', primaryPressed: '#FFB3CD', primarySoft: '#4B1F33',
    secondary: '#C6ABFF', secondaryPressed: '#DDCCFF', secondarySoft: '#332746',
    outline: '#9C8292', danger: '#FFB4AB', dangerSoft: '#4C2020',
    success: '#8EDCB5', successSoft: '#17372B',
    profileHeroStart: '#1A121C', profileHeroEnd: '#332244', profileHeroAccent: '#FF8FB5',
    profileHeroScrim: 'rgba(24,19,24,0.84)', profileHeroPattern: 'rgba(255,248,247,0.08)',
    profileMetricDivider: '#5D4857', overlay: 'rgba(0,0,0,0.72)',
    onPrimary: '#271719', onSecondary: '#271719', onDanger: '#271719', onSuccess: '#271719'
  },
  shadow: { ...theme.shadow, color: '#000000' }
};
