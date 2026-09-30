import { AppState, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { premiumApi, premiumStatusQueryKey } from './premiumApi';
import { getTrialRemainingMs } from './premiumEntitlements';
import { scheduleTrialExpiry } from './trialExpiryTimer';

export function usePremiumStatus(userId: string | undefined, enabled = true) {
  const query = useQuery({
    queryKey: premiumStatusQueryKey(userId),
    queryFn: premiumApi.getStatus,
    enabled: enabled && Boolean(userId),
    staleTime: 0,
    refetchInterval: (query) => query.state.data?.trialState === 'ACTIVE' ? 30_000 : false
  });
  const status = query.data;
  const [isTrialLocallyExpired, setTrialLocallyExpired] = useState(false);

  useEffect(() => {
    if (status?.trialState !== 'ACTIVE') {
      setTrialLocallyExpired(false);
      return;
    }

    const remainingMs = getTrialRemainingMs(status);
    if (remainingMs === 0) {
      setTrialLocallyExpired(true);
      return;
    }

    setTrialLocallyExpired(false);
    return scheduleTrialExpiry(remainingMs, () => {
      setTrialLocallyExpired(true);
      void query.refetch();
    });
  }, [query.refetch, status?.serverNow, status?.trialEndsAt, status?.trialState]);

  useEffect(() => {
    const refreshOnResume = () => {
      if (query.data?.trialState === 'ACTIVE') setTrialLocallyExpired(true);
      void query.refetch();
    };

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshOnResume();
    });
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshOnResume();
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    return () => {
      appStateSubscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [query.data?.trialState, query.refetch]);

  const trialExpiredForPresentation = status?.trialState === 'ACTIVE'
    && (isTrialLocallyExpired || getTrialRemainingMs(status) === 0);
  const presentationStatus = useMemo(() => trialExpiredForPresentation && status
    ? {
        ...status,
        trialState: 'EXPIRED' as const,
        benefits: { seeReceivedLikes: false, unlimitedLikes: false, dailyLikeLimit: 15 }
      }
    : status, [status, trialExpiredForPresentation]);

  return { ...query, data: presentationStatus, isTrialLocallyExpired: trialExpiredForPresentation };
}
