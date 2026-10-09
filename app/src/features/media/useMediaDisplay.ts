import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { emptyMediaDisplay, reduceMediaDisplay } from './mediaDisplayState';
import { isMediaScopeCurrent } from './mediaIdentity';
import type { MediaDescriptor, MediaScope } from './mediaTypes';

export function useMediaDisplay(media: MediaDescriptor | null, scope: MediaScope, getScope: () => MediaScope | null, retryToken = 0, onExpired?: () => void) {
  const deadline = media?.expiresAt ? Date.parse(media.expiresAt) : NaN;
  const expired = Boolean(media?.url && Number.isFinite(deadline) && deadline <= Date.now());
  const source = expired && media ? { ...media, url: null } : media;
  const [state, dispatch] = useReducer(reduceMediaDisplay, source, initial => reduceMediaDisplay(emptyMediaDisplay, { type: 'source', media: initial }));
  const current = useRef({ media, scope, getScope, state, onExpired });
  current.current = { media, scope, getScope, state, onExpired };
  const previousRetry = useRef(retryToken);
  const alive = useRef(true);
  useLayoutEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useLayoutEffect(() => {
    const retry = previousRetry.current !== retryToken;
    previousRetry.current = retryToken;
    dispatch({ type: retry ? 'retry' : 'source', media: source });
  }, [media?.identity, media?.url, media?.expiresAt, retryToken, expired]);
  const validScope = isMediaScopeCurrent(scope, getScope());
  const display = validScope && state.identity === media?.identity ? state : { ...emptyMediaDisplay, attempt: state.attempt };
  useEffect(() => {
    if (expired && !display.activeUrl && alive.current && isMediaScopeCurrent(scope, current.current.getScope())) current.current.onExpired?.();
  }, [expired, media?.identity, media?.url, media?.expiresAt]);
  const accepts = (identity: string, attempt: number) => alive.current
    && current.current.media?.identity === identity
    && current.current.state.attempt === attempt
    && isMediaScopeCurrent(scope, current.current.getScope());
  return { display, dispatch, accepts };
}
