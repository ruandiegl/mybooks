import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { theme } from '../../styles/theme';
import type { PremiumStatus } from './premium.types';
import { styles } from './premiumStyles';

function formatEndDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

type Props = {
  status?: PremiumStatus;
  loading: boolean;
  unavailable?: boolean;
  verified: boolean;
  onPress: () => void;
};

export function PremiumStatusCard({ status, loading, unavailable = false, verified, onPress }: Props) {
  const activeUntil = formatEndDate(status?.trialEndsAt);
  const active = status?.trialState === 'ACTIVE';
  const expired = status?.trialState === 'EXPIRED';
  const title = loading
    ? 'Verificando o Premium'
    : unavailable
      ? 'Não foi possível verificar o Premium'
      : active
      ? 'TrocaLivros Premium ativo'
      : expired
        ? 'Seu teste Premium terminou'
        : 'Experimente 30 dias grátis';
  const description = loading
    ? 'Estamos consultando o status da sua conta.'
    : unavailable
      ? 'As identidades de curtidas ficam ocultas até confirmarmos seu acesso.'
      : active
      ? activeUntil ? 'Acesso até ' + activeUntil + '.' : 'Seu teste termina automaticamente.'
      : expired
        ? 'Você voltou ao plano gratuito. Planos pagos ainda não estão disponíveis.'
        : status?.eligible
          ? 'Veja quem curtiu seus livros e curta sem limite por 30 dias.'
          : verified
            ? 'O teste gratuito já foi usado nesta conta.'
            : 'Confirme seu e-mail para liberar o teste gratuito.';
  const actionLabel = unavailable ? 'Tentar novamente' : active ? 'Ver benefícios' : expired ? 'Ver planos futuros' : 'Conhecer Premium';

  return (
    <Card style={styles.profileCard}>
      <View style={styles.profileCardHeading}>
        <View style={styles.profileIcon}><MaterialIcons name="auto-awesome" size={21} color={theme.colors.primary} /></View>
        <View style={styles.profileCardCopy}>
          <Text style={styles.profileCardTitle}>{title}</Text>
          <Text style={styles.profileCardDescription}>{description}</Text>
        </View>
      </View>
      <AppButton label={actionLabel} variant={active ? 'outline' : 'secondary'} onPress={onPress} />
    </Card>
  );
}
