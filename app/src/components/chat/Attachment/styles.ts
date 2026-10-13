import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({ box: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, padding: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.secondarySoft }, text: { color: theme.colors.secondary, fontFamily: theme.typography.semibold, fontSize: 12 } });
