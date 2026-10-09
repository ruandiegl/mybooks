import type { MediaDescriptor, MediaDisplayState } from './mediaTypes';

export const emptyMediaDisplay: MediaDisplayState = { identity: null, activeUrl: null, pendingUrl: null, attempt: 0, status: 'empty' };
export type MediaDisplayEvent =
  | { type: 'source'; media: MediaDescriptor | null }
  | { type: 'retry'; media: MediaDescriptor | null }
  | { type: 'loaded'; identity: string; attempt: number }
  | { type: 'failed'; identity: string; attempt: number }
  | { type: 'reset' };

export function reduceMediaDisplay(state: MediaDisplayState, event: MediaDisplayEvent): MediaDisplayState {
  if (event.type === 'reset') return { ...emptyMediaDisplay, attempt: state.attempt + 1 };
  if (event.type === 'source' || event.type === 'retry') {
    const identity = event.media?.identity ?? null;
    const changed = state.identity !== identity;
    const base = changed ? { ...emptyMediaDisplay, identity, attempt: state.attempt } : state;
    const url = event.media?.url ?? null;
    if (!url) return changed ? { ...base, attempt: base.attempt + 1 } : base;
    if (!changed && event.type !== 'retry' && (base.status === 'ready' || url === base.pendingUrl)) return base;
    return { ...base, pendingUrl: url, attempt: base.attempt + 1, status: 'loading' };
  }
  if (event.identity !== state.identity || event.attempt !== state.attempt || !state.pendingUrl) return state;
  return event.type === 'loaded'
    ? { ...state, activeUrl: state.pendingUrl, pendingUrl: null, status: 'ready' }
    : { ...state, pendingUrl: null, status: 'error' };
}
