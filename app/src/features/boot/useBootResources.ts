import { useEffect, useRef, useState } from 'react';
import { RESOURCE_FEEDBACK_MS } from './bootPolicy';
type Input = { themeHydrated: boolean; fontsLoaded: boolean; fontError: Error | null };
export function useBootResources({ themeHydrated, fontsLoaded, fontError }: Input): { ready: boolean; issue?: 'resource-error' | 'resource-timeout' } {
  const entered = useRef(false);
  const [slow, setSlow] = useState(false);
  if (themeHydrated && fontsLoaded && !fontError) entered.current = true;
  const ready = entered.current;
  useEffect(() => {
    if (ready || fontError) return;
    const timer = setTimeout(() => setSlow(true), RESOURCE_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [ready, fontError]);
  return { ready, issue: ready ? undefined : fontError ? 'resource-error' : slow ? 'resource-timeout' : undefined };
}
