import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: theme.radius.pill, backgroundColor: theme.colors.successSoft, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  text: { color: theme.colors.success, fontFamily: theme.typography.bold, fontSize: 11, letterSpacing: 0.3 }
});
