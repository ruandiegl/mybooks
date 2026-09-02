import { StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.outline },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.xs, position: 'relative' },
  tabPressed: { opacity: 0.72 },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.semibold, fontSize: 13 },
  selectedLabel: { color: theme.colors.primary },
  indicator: { position: 'absolute', left: 8, right: 8, bottom: -1, height: 2, borderRadius: 2, backgroundColor: theme.colors.primary }
});
