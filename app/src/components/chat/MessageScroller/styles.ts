import { StyleSheet } from 'react-native';
import type { AppTheme } from '../../../styles/theme';
export const createStyles = (theme: AppTheme) => StyleSheet.create({ list: { padding: theme.spacing.md, gap: theme.spacing.xs, flexGrow: 1, justifyContent: 'flex-end' } });
