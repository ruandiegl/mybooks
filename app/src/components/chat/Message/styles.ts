import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({ row: { gap: theme.spacing.xxs, marginVertical: 2 }, sender: { color: theme.colors.mutedForeground, fontFamily: theme.typography.medium, fontSize: 10, marginLeft: 8 } });
