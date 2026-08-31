import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { theme } from '../../../styles/theme';
import { styles } from './styles';

type Props = { state: 'connecting' | 'connected' | 'offline' };

export function ConnectionStateBanner({ state }: Props) {
  if (state === 'connected') return null;
  const connecting = state === 'connecting';
  return <View accessibilityLiveRegion="polite" style={[styles.banner, connecting ? styles.connecting : styles.offline]}><MaterialIcons name={connecting ? 'sync' : 'cloud-off'} size={16} color={theme.colors.foreground} /><Text style={styles.label}>{connecting ? 'Conectando ao chat…' : 'Tempo real indisponível. O envio seguro continua ativo.'}</Text></View>;
}
