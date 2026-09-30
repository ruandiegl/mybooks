import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { deriveOnboardingState } from '../onboarding/onboarding';
import { useSession } from '../../providers/SessionProvider';
import { apiErrorMessage } from '../../services/api';
import { premiumApi, premiumStatusQueryKey } from './premiumApi';
import { PremiumOfferModal } from './PremiumOfferModal';
import { resolvePremiumPrompt } from './premiumPrompt';
import { PremiumStatusCard } from './PremiumStatusCard';
import type { PremiumStatus } from './premium.types';
import { usePremiumStatus } from './usePremiumStatus';

type PremiumOfferContextValue = {
  openOffer: () => void;
};

const PremiumOfferContext = createContext<PremiumOfferContextValue | null>(null);

export function usePremiumOffer() {
  const context = useContext(PremiumOfferContext);
  if (!context) throw new Error('usePremiumOffer deve ser usado dentro de PremiumOfferProvider.');
  return context;
}

export function PremiumOfferProvider({ children }: PropsWithChildren) {
  const { isSignedIn, user } = useSession();
  const queryClient = useQueryClient();
  const statusQuery = usePremiumStatus(user?.id, isSignedIn);
  const [modalVisible, setModalVisible] = useState(false);
  const promptedUserId = useRef<string | null>(null);
  const previousTrialState = useRef<PremiumStatus['trialState'] | undefined>(undefined);

  const markPrompted = useMutation({
    mutationFn: premiumApi.markOfferPrompted,
    onSuccess: (status) => {
      if (user?.id) queryClient.setQueryData(premiumStatusQueryKey(user.id), status);
    }
  });

  const activateTrial = useMutation({
    mutationFn: premiumApi.activateTrial,
    onSuccess: async (status) => {
      if (user?.id) queryClient.setQueryData(premiumStatusQueryKey(user.id), status);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['premium', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['likes'] })
      ]);
      setModalVisible(false);
    }
  });

  const openOffer = useCallback(() => {
    setModalVisible(true);
    if (user?.id) promptedUserId.current = user.id;
    if (statusQuery.data?.eligible) markPrompted.mutate();
  }, [markPrompted, statusQuery.data?.eligible, user?.id]);

  const closeOffer = useCallback(() => {
    setModalVisible(false);
    activateTrial.reset();
  }, [activateTrial]);

  useEffect(() => {
    if (!isSignedIn || !user) {
      promptedUserId.current = null;
      setModalVisible(false);
      previousTrialState.current = undefined;
      return;
    }

    const status = statusQuery.data;
    if (!status || statusQuery.isError) return;

    if (previousTrialState.current === 'ACTIVE' && status.trialState === 'EXPIRED') {
      queryClient.removeQueries({ queryKey: ['likes', 'received'] });
      void queryClient.invalidateQueries({ queryKey: ['likes'] });
    }
    previousTrialState.current = status.trialState;

    if (promptedUserId.current === user.id) return;
    const { nextStep } = deriveOnboardingState(user);
    const presentation = resolvePremiumPrompt(status, nextStep, false);
    if (!presentation) return;

    promptedUserId.current = user.id;
    if (presentation === 'MODAL') setModalVisible(true);
    markPrompted.mutate();
  }, [isSignedIn, markPrompted, queryClient, statusQuery.data, statusQuery.isError, user]);

  const statusError = statusQuery.isError
    ? apiErrorMessage(statusQuery.error, 'Não foi possível consultar o Premium agora.')
    : undefined;
  const activationError = activateTrial.isError
    ? apiErrorMessage(activateTrial.error, 'Não foi possível ativar o teste agora. Confira a conexão e tente novamente.')
    : undefined;

  return (
    <PremiumOfferContext.Provider value={{ openOffer }}>
      <View style={{ flex: 1 }}>
        {children}
        <PremiumOfferModal
          visible={isSignedIn && modalVisible}
          status={statusQuery.data}
          loadingStatus={statusQuery.isLoading}
          statusError={statusError}
          activationLoading={activateTrial.isPending}
          activationError={activationError}
          verified={Boolean(user?.emailVerifiedAt && user.isActive)}
          onClose={closeOffer}
          onActivate={() => { activateTrial.reset(); activateTrial.mutate(); }}
          onRetry={() => { void statusQuery.refetch(); }}
        />
      </View>
    </PremiumOfferContext.Provider>
  );
}

export { PremiumStatusCard };
