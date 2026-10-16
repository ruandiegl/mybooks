import { useEffect, useState } from 'react';
import { SESSION_FEEDBACK_MS, type BootIssue } from './bootPolicy';
/** Feedback only: never changes session state, timers, locks or HTTP requests. */
export function useSessionBootIssue(loading: boolean): BootIssue | undefined {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), SESSION_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [loading]);
  return loading && slow ? 'session-slow' : undefined;
}
