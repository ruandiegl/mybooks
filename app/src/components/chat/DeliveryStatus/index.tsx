import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';
import { theme } from '../../../styles/theme';
import type { Message } from '../../../types/api';
import { styles } from './styles';

type Props = { status: NonNullable<Message['localStatus']>; onRetry?: () => void };

export function DeliveryStatus({ status, onRetry }: Props) {
  if (status === 'failed' && onRetry) {
    return <Pressable accessibilityRole="button" accessibilityLabel="Tentar enviar mensagem novamente" hitSlop={4} onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><MaterialIcons name="refresh" size={16} color={theme.colors.danger} /><Text style={styles.failed}>Falhou · tentar novamente</Text></Pressable>;
  }

  return <View accessibilityLabel={status === 'sending' ? 'Mensagem sendo enviada' : 'Mensagem enviada'} style={styles.status}><MaterialIcons name={status === 'sending' ? 'schedule' : 'done'} size={13} color={theme.colors.mutedForeground} /><Text style={styles.label}>{status === 'sending' ? 'Enviando' : 'Enviada'}</Text></View>;
}
