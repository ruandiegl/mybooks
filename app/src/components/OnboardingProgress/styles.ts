import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.xs },
  label: { color: theme.colors.primary, fontFamily: theme.typography.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  track: { height: 6, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary }
});
