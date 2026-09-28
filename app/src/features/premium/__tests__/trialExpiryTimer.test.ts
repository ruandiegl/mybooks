import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_TRIAL_TIMEOUT_MS, scheduleTrialExpiry } from '../trialExpiryTimer';

describe('scheduleTrialExpiry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('schedules trials longer than the browser timeout limit in safe chunks', () => {
    const onExpire = vi.fn();
    const trialDurationMs = 30 * 24 * 60 * 60 * 1000;

    scheduleTrialExpiry(trialDurationMs, onExpire);
    vi.advanceTimersByTime(MAX_TRIAL_TIMEOUT_MS);

    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(trialDurationMs - MAX_TRIAL_TIMEOUT_MS - 1);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledOnce();
  });
});
