import { describe, expect, it, vi } from 'vitest';
import { createDailyCheckInScheduler, getSaoPauloDayKey } from '../checkInScheduler';

function makeScheduler(today = '2026-10-26') {
  const day = { value: today };
  const checkIn = vi.fn(async () => ({ dayKey: day.value, currentStreak: 1, checkedInToday: true as const }));
  const onSuccess = vi.fn();
  const scheduler = createDailyCheckInScheduler({
    getToday: () => day.value,
    checkIn,
    onSuccess
  });
  return { day, checkIn, onSuccess, scheduler };
}

describe('daily check-in scheduler', () => {
  it('uses the Sao Paulo day around UTC midnight', () => {
    expect(getSaoPauloDayKey(new Date('2026-10-27T02:59:59.999Z'))).toBe('2026-10-26');
    expect(getSaoPauloDayKey(new Date('2026-10-27T03:00:00.000Z'))).toBe('2026-10-27');
  });

  it('waits until a restored session is loaded and signed in', async () => {
    const { checkIn, scheduler } = makeScheduler();

    await scheduler.setSession({ isLoaded: false, isSignedIn: true, userId: 'user-1' });
    await scheduler.setSession({ isLoaded: true, isSignedIn: false, userId: null });
    expect(checkIn).not.toHaveBeenCalled();

    await scheduler.setSession({ isLoaded: true, isSignedIn: true, userId: 'user-1' });
    expect(checkIn).toHaveBeenCalledTimes(1);
  });

  it('checks in after foreground on a new Sao Paulo day', async () => {
    const { day, checkIn, scheduler } = makeScheduler();
    await scheduler.setSession({ isLoaded: true, isSignedIn: true, userId: 'user-1' });

    day.value = '2026-10-27';
    await scheduler.onAppStateChange('active');

    expect(checkIn).toHaveBeenCalledTimes(2);
  });

  it('skips repeated active events for the same day', async () => {
    const { checkIn, scheduler } = makeScheduler();
    await scheduler.setSession({ isLoaded: true, isSignedIn: true, userId: 'user-1' });

    await scheduler.onAppStateChange('background');
    await scheduler.onAppStateChange('active');
    await scheduler.onAppStateChange('active');

    expect(checkIn).toHaveBeenCalledTimes(1);
  });

  it('retries after failure without marking the day successful', async () => {
    const { checkIn, onSuccess, scheduler } = makeScheduler();
    checkIn.mockRejectedValueOnce(new Error('network unavailable'));

    await scheduler.setSession({ isLoaded: true, isSignedIn: true, userId: 'user-1' });
    expect(onSuccess).not.toHaveBeenCalled();

    await scheduler.onAppStateChange('active');
    expect(checkIn).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight request across session and foreground events', async () => {
    const { checkIn, scheduler } = makeScheduler();
    let resolveCheckIn!: (result: { dayKey: string; currentStreak: number; checkedInToday: true }) => void;
    checkIn.mockImplementation(() => new Promise((resolve) => { resolveCheckIn = resolve; }));

    const restoredSession = scheduler.setSession({ isLoaded: true, isSignedIn: true, userId: 'user-1' });
    const foreground = scheduler.onAppStateChange('active');
    await Promise.resolve();
    expect(checkIn).toHaveBeenCalledTimes(1);

    resolveCheckIn({ dayKey: '2026-10-26', currentStreak: 1, checkedInToday: true });
    await Promise.all([restoredSession, foreground]);
  });

  it('checks in for a new user even when another user checked in today', async () => {
    const { checkIn, scheduler } = makeScheduler();
    await scheduler.setSession({ isLoaded: true, isSignedIn: true, userId: 'user-1' });
    await scheduler.setSession({ isLoaded: true, isSignedIn: false, userId: null });
    await scheduler.setSession({ isLoaded: true, isSignedIn: true, userId: 'user-2' });

    expect(checkIn).toHaveBeenCalledTimes(2);
  });

  it('does not check in while signed out or outside the active state', async () => {
    const { checkIn, scheduler } = makeScheduler();
    await scheduler.setSession({ isLoaded: true, isSignedIn: false, userId: null });
    await scheduler.onAppStateChange('active');
    expect(checkIn).not.toHaveBeenCalled();
  });
});
