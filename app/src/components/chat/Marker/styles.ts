import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({ row: { alignItems: 'center', marginVertical: theme.spacing.sm }, text: { color: theme.colors.mutedForeground, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.sm, fontFamily: theme.typography.medium, fontSize: 11 } });
