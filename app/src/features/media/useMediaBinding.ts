import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useSession } from '../../providers/SessionProvider';
import { toMediaScope } from './mediaIdentity';
import type { MediaBinding } from './mediaTypes';

export function useMediaBinding(): MediaBinding {
  const { getSessionScope } = useSession();
  const getScope = useCallback(() => toMediaScope(getSessionScope()), [getSessionScope]);
  const [transitionMs, setTransition] = useState<0 | 120>(0);
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setTransition(query.matches ? 0 : 120);
      update(); query.addEventListener?.('change', update);
      return () => query.removeEventListener?.('change', update);
    }
    let alive = true, changed = false;
    const update = (value: boolean) => { if (alive) setTransition(value ? 0 : 120); };
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (!changed) update(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; update(value); });
    return () => { alive = false; subscription.remove(); };
  }, []);
  return { scope: getScope(), getScope, transitionMs };
}
