import { useThemedStyles } from '../../styles/useThemedStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAppTheme } from '../../providers/ThemeProvider';
import { AppButton } from '../AppButton';
import { createStyles } from './styles';
type Icon = ComponentProps<typeof MaterialIcons>['name'];
type Props = { title?: string; description?: string; icon?: Icon; loading?: boolean; compact?: boolean; actionVariant?: ComponentProps<typeof AppButton>['variant']; actionLabel?: string; onAction?: () => void };
export function StateView({ title = 'Carregando', description, icon = 'auto-stories', loading, compact, actionVariant = 'outline', actionLabel, onAction }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();

  return (
    <View style={[styles.box, compact && styles.compact]}>
      {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : <View style={[styles.icon, compact && styles.compactIcon]}><MaterialIcons name={icon} size={compact ? 28 : 32} color={theme.colors.primary} /></View>}
      <Text style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} variant={actionVariant} onPress={onAction} /> : null}
    </View>
  );
}
