export const MAX_TRIAL_TIMEOUT_MS = 2_147_000_000;

export function scheduleTrialExpiry(delayMs: number, onExpire: () => void) {
  const deadline = Date.now() + Math.max(0, delayMs);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const scheduleNextCheck = () => {
    if (cancelled) return;

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      onExpire();
      return;
    }

    timer = setTimeout(scheduleNextCheck, Math.min(remainingMs, MAX_TRIAL_TIMEOUT_MS));
  };

  timer = setTimeout(scheduleNextCheck, Math.min(Math.max(0, delayMs), MAX_TRIAL_TIMEOUT_MS));

  return () => {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
