import { useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';
import { createDailyCheckInScheduler, getSaoPauloDayKey } from './checkInScheduler';
import { GAMIFICATION_LEADERBOARD_QUERY_KEY } from './api';
import { useSession } from '../../providers/SessionProvider';
import { api } from '../../services/api';
import type { ApiEnvelope, GamificationCheckIn } from '../../types/api';

export function DailyCheckInCoordinator() {
  const { isLoaded, isSignedIn, user } = useSession();
  const queryClient = useQueryClient();
  const schedulerRef = useRef<ReturnType<typeof createDailyCheckInScheduler> | null>(null);

  if (!schedulerRef.current) {
    schedulerRef.current = createDailyCheckInScheduler({
      getToday: () => getSaoPauloDayKey(new Date()),
      checkIn: async () => (await api.post<ApiEnvelope<GamificationCheckIn>>('/api/v1/gamification/check-in')).data.data,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: GAMIFICATION_LEADERBOARD_QUERY_KEY });
      }
    });
  }

  const scheduler = schedulerRef.current;

  useEffect(() => {
    void scheduler.setSession({ isLoaded, isSignedIn, userId: user?.id ?? null });
  }, [isLoaded, isSignedIn, scheduler, user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      void scheduler.onAppStateChange(state);
    });
    return () => subscription.remove();
  }, [scheduler]);

  return null;
}
