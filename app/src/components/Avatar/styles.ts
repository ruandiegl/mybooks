import type { CSSProperties } from 'react';
import { StyleSheet, type ImageStyle, type ViewStyle } from 'react-native';
import { theme } from '../../styles/theme';

// Web-only properties are applied by Avatar only when Platform.OS is web.
const browserGuard: ViewStyle & Pick<CSSProperties, 'WebkitTouchCallout' | 'userSelect'> = { WebkitTouchCallout: 'none', userSelect: 'none' };
const guardedImage: ImageStyle & { pointerEvents: 'none' } = { pointerEvents: 'none' };

export const styles = StyleSheet.create({
  avatar: { borderRadius: theme.radius.pill, backgroundColor: theme.colors.secondarySoft, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', borderRadius: theme.radius.pill },
  browserGuard,
  guardedImage,
  initials: { color: theme.colors.secondary, fontFamily: theme.typography.bold }
});
