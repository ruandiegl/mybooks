import { useThemedStyles } from '../../../styles/useThemedStyles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { useAppTheme } from '../../../providers/ThemeProvider';
import { createStyles } from './styles';

type Props = { state: 'connecting' | 'connected' | 'offline' };

export function ConnectionStateBanner({ state }: Props) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useAppTheme();

  if (state === 'connected') return null;
  const connecting = state === 'connecting';
  return <View accessibilityLiveRegion="polite" style={[styles.banner, connecting ? styles.connecting : styles.offline]}><MaterialIcons name={connecting ? 'sync' : 'cloud-off'} size={16} color={theme.colors.foreground} /><Text style={styles.label}>{connecting ? 'Conectando ao chat…' : 'Tempo real indisponível. O envio seguro continua ativo.'}</Text></View>;
}
