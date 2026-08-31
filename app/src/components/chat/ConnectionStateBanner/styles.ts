import { StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';

export const styles = StyleSheet.create({
  banner: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  connecting: { backgroundColor: theme.colors.secondarySoft },
  offline: { backgroundColor: theme.colors.surfaceStrong },
  label: { flexShrink: 1, color: theme.colors.foreground, fontFamily: theme.typography.medium, fontSize: 11, textAlign: 'center' }
});
