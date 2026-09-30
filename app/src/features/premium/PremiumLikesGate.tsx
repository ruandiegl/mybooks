import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import type { PremiumStatus } from './premium.types';
import { PremiumStatusCard } from './PremiumStatusCard';
import { styles } from './premiumStyles';

type Props = {
  count?: number;
  status?: PremiumStatus;
  loading: boolean;
  unavailable?: boolean;
  verified: boolean;
  onOpenOffer: () => void;
};

export function PremiumLikesGate({ count, status, loading, unavailable, verified, onOpenOffer }: Props) {
  return (
    <View style={styles.likesGate}>
      <View style={styles.likesGateIcon}><MaterialIcons name="favorite" size={28} color={theme.colors.primary} /></View>
      <Text accessibilityRole="header" style={styles.likesGateTitle}>
        {typeof count === 'number'
          ? count === 1 ? '1 curtida pendente' : count + ' curtidas pendentes'
          : 'Confira suas curtidas pendentes'}
      </Text>
      <Text style={styles.likesGateDescription}>
        A contagem continua gratuita. O Premium mostra as pessoas e os livros que receberam curtidas.
      </Text>
      <PremiumStatusCard status={status} loading={loading} unavailable={unavailable} verified={verified} onPress={onOpenOffer} />
    </View>
  );
}
