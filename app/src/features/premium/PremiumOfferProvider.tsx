import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react';
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
import type { SessionActor } from '../auth/sessionActor';

type PremiumOfferContextValue = {
  openOffer: () => void;
  setPresentationBlocked: (key: string, blocked: boolean) => void;
};

const PremiumOfferContext = createContext<PremiumOfferContextValue | null>(null);

export function usePremiumOffer() {
  const context = useContext(PremiumOfferContext);
  if (!context) throw new Error('usePremiumOffer deve ser usado dentro de PremiumOfferProvider.');
  return context;
}

export function PremiumOfferProvider({ children }: PropsWithChildren) {
  const session = useSession();
  const { isSignedIn, user } = session;
  const actor = session.captureActor();
  const actorKey = actor ? `${actor.userId}:${actor.epoch}` : null;
  const queryClient = useQueryClient();
  const statusQuery = usePremiumStatus(user?.id, isSignedIn);
  const [modalVisible, setModalVisible] = useState(false);
  const [blockers, setBlockers] = useState<Set<string>>(() => new Set());
  const blockersRef = useRef(blockers);
  const blocked = blockers.size > 0;
  const setPresentationBlocked = useCallback((key: string, value: boolean) => {
    if (blockersRef.current.has(key) === value) return;
    const next = new Set(blockersRef.current); if (value) next.add(key); else next.delete(key);
    blockersRef.current = next; setBlockers(next);
  }, []);
  const promptedUserId = useRef<string | null>(null);
  const previousTrialState = useRef<PremiumStatus['trialState'] | undefined>(undefined);
  useLayoutEffect(() => { setModalVisible(false); promptedUserId.current = null; previousTrialState.current = undefined; }, [actorKey]);

  const markPrompted = useMutation({
    mutationFn: (owner: SessionActor) => { if (!session.isActorCurrent(owner)) throw Error('A sessão mudou.'); return premiumApi.markOfferPrompted(owner); },
    onSuccess: (status, owner) => {
      if (session.isActorCurrent(owner)) queryClient.setQueryData(premiumStatusQueryKey(owner.userId), status);
    }
  });

  const activateTrial = useMutation({
    mutationFn: (owner: SessionActor) => { if (!session.isActorCurrent(owner)) throw Error('A sessão mudou.'); return premiumApi.activateTrial(owner); },
    onSuccess: async (status, owner) => {
      if (!session.isActorCurrent(owner)) return;
      queryClient.setQueryData(premiumStatusQueryKey(owner.userId), status);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['premium', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['likes'] })
      ]);
      setModalVisible(false);
    }
  });

  const openOffer = useCallback(() => {
    const owner = session.captureActor();
    if (blockersRef.current.size || !owner) return;
    setModalVisible(true);
    if (user?.id) promptedUserId.current = user.id;
    if (statusQuery.data?.eligible) markPrompted.mutate(owner);
  }, [blocked, markPrompted, statusQuery.data?.eligible, user?.id]);

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

    if (blockersRef.current.size || !actor || !session.isActorCurrent(actor) || promptedUserId.current === user.id) return;
    const { nextStep } = deriveOnboardingState(user);
    const presentation = resolvePremiumPrompt(status, nextStep, false);
    if (!presentation) return;

    promptedUserId.current = user.id;
    if (presentation === 'MODAL') setModalVisible(true);
    markPrompted.mutate(actor);
  }, [actorKey, blocked, isSignedIn, markPrompted, queryClient, statusQuery.data, statusQuery.isError, user]);

  const statusError = statusQuery.isError
    ? apiErrorMessage(statusQuery.error, 'Não foi possível consultar o Premium agora.')
    : undefined;
  const activationError = activateTrial.isError
    ? apiErrorMessage(activateTrial.error, 'Não foi possível ativar o teste agora. Confira a conexão e tente novamente.')
    : undefined;

  return (
    <PremiumOfferContext.Provider value={{ openOffer, setPresentationBlocked }}>
      <View style={{ flex: 1 }}>
        {children}
        <PremiumOfferModal
          visible={isSignedIn && modalVisible && !blocked}
          status={statusQuery.data}
          loadingStatus={statusQuery.isLoading}
          statusError={statusError}
          activationLoading={activateTrial.isPending}
          activationError={activationError}
          verified={Boolean(user?.emailVerifiedAt && user.isActive)}
          onClose={closeOffer}
          onActivate={() => { const owner = session.captureActor(); if (owner) { activateTrial.reset(); activateTrial.mutate(owner); } }}
          onRetry={() => { void statusQuery.refetch(); }}
        />
      </View>
    </PremiumOfferContext.Provider>
  );
}

export { PremiumStatusCard };
