import { useLayoutEffect, useReducer, useRef } from 'react';
import { emptyMediaDisplay, reduceMediaDisplay } from './mediaDisplayState';
import { isMediaScopeCurrent } from './mediaIdentity';
import type { MediaDescriptor, MediaScope } from './mediaTypes';

export function useMediaDisplay(media: MediaDescriptor | null, scope: MediaScope, getScope: () => MediaScope | null, retryToken = 0) {
  const [state, dispatch] = useReducer(reduceMediaDisplay, media, source => reduceMediaDisplay(emptyMediaDisplay, { type: 'source', media: source }));
  const current = useRef({ media, scope, getScope, state });
  current.current = { media, scope, getScope, state };
  const previousRetry = useRef(retryToken);
  const alive = useRef(true);
  useLayoutEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useLayoutEffect(() => {
    const retry = previousRetry.current !== retryToken;
    previousRetry.current = retryToken;
    dispatch({ type: retry ? 'retry' : 'source', media });
  }, [media?.identity, media?.url, retryToken]);
  const validScope = isMediaScopeCurrent(scope, getScope());
  const display = validScope && state.identity === media?.identity ? state : { ...emptyMediaDisplay, attempt: state.attempt };
  const accepts = (identity: string, attempt: number) => alive.current
    && current.current.media?.identity === identity
    && current.current.state.attempt === attempt
    && isMediaScopeCurrent(scope, current.current.getScope());
  return { display, dispatch, accepts };
}
