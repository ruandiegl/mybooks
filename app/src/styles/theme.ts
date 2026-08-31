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
