import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import { AppButton } from '../AppButton';
import { styles } from './styles';
type Icon = ComponentProps<typeof MaterialIcons>['name'];
type Props = { title?: string; description?: string; icon?: Icon; loading?: boolean; actionLabel?: string; onAction?: () => void };
export function StateView({ title = 'Carregando', description, icon = 'auto-stories', loading, actionLabel, onAction }: Props) {
  return <View style={styles.box}>{loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : <View style={styles.icon}><MaterialIcons name={icon} size={32} color={theme.colors.primary} /></View>}<Text style={styles.title}>{title}</Text>{description ? <Text style={styles.description}>{description}</Text> : null}{actionLabel && onAction ? <AppButton label={actionLabel} variant="outline" onPress={onAction} /> : null}</View>;
}
