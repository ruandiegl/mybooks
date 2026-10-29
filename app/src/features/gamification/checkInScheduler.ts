export type DailyCheckInSession = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
};

export type DailyCheckInResult = {
  dayKey: string;
  currentStreak: number;
  checkedInToday: true;
};

type SchedulerOptions = {
  getToday: () => string;
  checkIn: () => Promise<DailyCheckInResult>;
  onSuccess: () => void;
};

type InFlightCheckIn = { userId: string; promise: Promise<void> };

export function getSaoPauloDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function createDailyCheckInScheduler({ getToday, checkIn, onSuccess }: SchedulerOptions) {
  let session: DailyCheckInSession = { isLoaded: false, isSignedIn: false, userId: null };
  let lastSuccessfulUserId: string | null = null;
  let lastSuccessfulDay: string | null = null;
  let inFlight: InFlightCheckIn | null = null;

  function checkInIfNeeded(): Promise<void> {
    const { isLoaded, isSignedIn, userId } = session;
    if (!isLoaded || !isSignedIn || !userId) return Promise.resolve();

    if (lastSuccessfulUserId === userId && lastSuccessfulDay === getToday()) return Promise.resolve();
    if (inFlight?.userId === userId) return inFlight.promise;

    const requestUserId = userId;
    const promise = Promise.resolve()
      .then(checkIn)
      .then((result) => {
        if (session.isSignedIn && session.userId === requestUserId) {
          lastSuccessfulUserId = requestUserId;
          lastSuccessfulDay = result.dayKey;
          onSuccess();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (inFlight?.promise === promise) inFlight = null;
      });

    inFlight = { userId: requestUserId, promise };
    return promise;
  }

  return {
    setSession(nextSession: DailyCheckInSession): Promise<void> {
      if (nextSession.isSignedIn && nextSession.userId && lastSuccessfulUserId
        && nextSession.userId !== lastSuccessfulUserId) {
        lastSuccessfulUserId = null;
        lastSuccessfulDay = null;
      }
      session = nextSession;
      return checkInIfNeeded();
    },
    onAppStateChange(state: string): Promise<void> {
      return state === 'active' ? checkInIfNeeded() : Promise.resolve();
    }
  };
}
