import { StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';

export const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs, minHeight: 28, paddingHorizontal: theme.spacing.sm },
  label: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 11 }
});
