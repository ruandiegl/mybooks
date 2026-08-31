import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: theme.spacing.xs },
  item: { minHeight: 48, justifyContent: 'center', borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.outline, paddingHorizontal: theme.spacing.md, paddingVertical: 8, backgroundColor: theme.colors.surface },
  selected: { borderColor: theme.colors.secondary, backgroundColor: theme.colors.secondarySoft },
  pressed: { opacity: 0.72 },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.semibold, fontSize: 12 },
  selectedLabel: { color: theme.colors.secondary }
});
