import { useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import { useMediaDisplay } from '../../features/media/useMediaDisplay';
import type { RemoteMediaImageProps } from './RemoteMediaImage.types';

export function RemoteMediaImage(props: RemoteMediaImageProps) {
  const { display, dispatch, accepts } = useMediaDisplay(props.media, props.scope, props.getScope, props.retryToken);
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props); callbacks.current = props;
  const identity = props.media?.identity ?? null;
  useLayoutEffect(() => { host.current?.replaceChildren(); }, [identity, props.scope.userId, props.scope.epoch]);
  useLayoutEffect(() => {
    if (!display.pendingUrl || !display.identity) return;
    const image = new Image();
    const attempt = display.attempt, identity = display.identity;
    let cancelled = false, settled = false;
    const finish = () => {
      if (cancelled || settled || !accepts(identity, attempt) || !host.current) return;
      settled = true;
      image.alt = callbacks.current.accessibilityLabel ?? '';
      image.draggable = false;
      Object.assign(image.style, { width: '100%', height: '100%', display: 'block', objectFit: callbacks.current.fit, borderRadius: 'inherit', userSelect: 'none', animationDuration: callbacks.current.transitionMs + 'ms' });
      // Keep the exact decoded node. Two consumers each own their own node.
      image.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: callbacks.current.transitionMs, easing: 'ease-out' });
      host.current.replaceChildren(image);
      dispatch({ type: 'loaded', identity, attempt });
      callbacks.current.onReady?.();
    };
    image.onload = finish;
    image.onerror = () => {
      if (cancelled || settled || !accepts(identity, attempt)) return;
      settled = true;
      dispatch({ type: 'failed', identity, attempt });
      callbacks.current.onError?.();
    };
    image.src = display.pendingUrl;
    if (image.decode) void image.decode().then(finish).catch(() => { if (image.complete && image.naturalWidth > 0) finish(); });
    else if (image.complete && image.naturalWidth > 0) finish();
    return () => { cancelled = true; image.onload = null; image.onerror = null; };
  }, [display.pendingUrl, display.identity, display.attempt]);
  const visible = display.activeUrl || display.pendingUrl;
  // Clear a prior actor synchronously in render, before layout effects run.
  return <View style={[props.style, { overflow: 'hidden' }]} pointerEvents="none"><div key={identity + ':' + props.scope.epoch} ref={host} style={{ width: '100%', height: '100%', borderRadius: 'inherit', display: visible ? 'block' : 'none' }} /></View>;
}
