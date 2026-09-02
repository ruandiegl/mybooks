import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xxs, paddingVertical: theme.spacing.xs },
  value: { color: theme.colors.foreground, fontFamily: theme.typography.bold, fontSize: 22, lineHeight: 27 },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 11, textAlign: 'center' },
  divider: { width: 1, height: 44, alignSelf: 'center', backgroundColor: theme.colors.profileMetricDivider }
});
