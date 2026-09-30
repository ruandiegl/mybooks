import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../styles/theme';
import type { PremiumStatus } from './premium.types';
import { shouldDismissPremiumSheet } from './premiumSheetGesture';
import { styles } from './premiumStyles';

type Props = {
  visible: boolean;
  status?: PremiumStatus;
  loadingStatus: boolean;
  statusError?: string;
  activationLoading: boolean;
  activationError?: string;
  verified: boolean;
  onClose: () => void;
  onActivate: () => void;
  onRetry: () => void;
};

function formatEndDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(date);
}

function PlanCard({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={'Plano ' + label + ', em breve'} style={styles.planCard}>
      <Text style={styles.planTitle}>{label}</Text>
      <View style={styles.comingSoon}><Text style={styles.comingSoonText}>Em breve</Text></View>
    </View>
  );
}

export function PremiumOfferModal({
  visible,
  status,
  loadingStatus,
  statusError,
  activationLoading,
  activationError,
  verified,
  onClose,
  onActivate,
  onRetry
}: Props) {
  const insets = useSafeAreaInsets();
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [dragY, visible]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_event, gesture) => scrollOffsetY.current <= 0
      && gesture.dy > 8
      && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_event, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (shouldDismissPremiumSheet(gesture.dy, gesture.vy)) {
        onClose();
        return;
      }

      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 15 }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 15 }).start();
    }
  }), [dragY, onClose, scrollOffsetY]);
  const activeUntil = formatEndDate(status?.trialEndsAt);
  const isActive = status?.trialState === 'ACTIVE';
  const isExpired = status?.trialState === 'EXPIRED';
  const canActivate = Boolean(status?.eligible && verified);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar oferta Premium"
          style={styles.outsidePressable}
          onPress={onClose}
        />
        <Animated.View {...panResponder.panHandlers} style={[styles.modal, { transform: [{ translateY: dragY }] }]} accessibilityViewIsModal>
          <View style={styles.sheetHandleArea} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.sheetHandle} />
          </View>
          <View style={styles.header}>
            <View style={styles.brandIcon}><MaterialIcons name="auto-awesome" size={25} color={theme.colors.white} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar oferta Premium" style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView
            onScroll={(event) => { scrollOffsetY.current = Math.max(0, event.nativeEvent.contentOffset.y); }}
            scrollEventThrottle={16}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}
            showsVerticalScrollIndicator={false}
          >
            <Text accessibilityRole="header" style={styles.title}>Conheça o TrocaLivros Premium</Text>
            <Text style={styles.subtitle}>Experimente todos os benefícios por 30 dias exatos.</Text>

            <View style={styles.promise}>
              <Text style={styles.promiseText}>Sem cartão, sem cobrança e sem renovação. O acesso termina automaticamente.</Text>
            </View>

            <View style={styles.benefit}>
              <MaterialIcons name="favorite" size={21} color={theme.colors.primary} />
              <Text style={styles.benefitText}>Descubra quem curtiu seus livros.</Text>
            </View>
            <View style={styles.benefit}>
              <MaterialIcons name="all-inclusive" size={21} color={theme.colors.primary} />
              <Text style={styles.benefitText}>Curta livros sem limite durante o teste.</Text>
            </View>

            {loadingStatus ? (
              <View style={styles.statusNotice}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.statusText}>Verificando a disponibilidade do teste…</Text></View>
            ) : statusError ? (
              <View style={styles.statusNotice}>
                <Text style={styles.statusText}>{statusError}</Text>
                <AppButton label="Tentar novamente" variant="outline" onPress={onRetry} />
              </View>
            ) : isActive ? (
              <View style={styles.activeNotice}>
                <Text style={styles.activeTitle}>Seu Premium está ativo</Text>
                <Text style={styles.statusText}>{activeUntil ? 'Acesso até ' + activeUntil + '.' : 'O teste termina automaticamente após 30 dias.'}</Text>
              </View>
            ) : isExpired ? (
              <View style={styles.statusNotice}><Text style={styles.statusText}>Seu teste terminou e sua conta voltou ao plano gratuito.</Text></View>
            ) : canActivate ? (
              <AppButton label="Sim, quero testar grátis" icon="check" loading={activationLoading} onPress={onActivate} />
            ) : (
              <View style={styles.statusNotice}>
                <Text style={styles.statusText}>{verified ? 'Esta conta já usou o teste gratuito.' : 'Confirme seu e-mail para ativar o teste gratuito.'}</Text>
              </View>
            )}

            {activationError ? <Text accessibilityRole="alert" style={styles.errorText}>{activationError}</Text> : null}

            <Text style={styles.plansHeading}>Planos futuros</Text>
            <View style={styles.plans}>
              <PlanCard label="Semanal" />
              <PlanCard label="Mensal" />
              <PlanCard label="Anual" />
            </View>
            <Text style={styles.futureNote}>Os planos ainda não estão disponíveis e não possuem preço ou compra nesta versão.</Text>
            <AppButton label={isActive ? 'Fechar' : 'Agora não'} variant="ghost" onPress={onClose} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
