import { useRef } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useMediaDisplay } from '../../features/media/useMediaDisplay';
import type { RemoteMediaImageProps } from './RemoteMediaImage.types';

export function RemoteMediaImage(props: RemoteMediaImageProps) {
  const { display, dispatch, accepts } = useMediaDisplay(props.media, props.scope, props.getScope, props.retryToken, props.onError);
  const activeAttempt = useRef<number | null>(null);
  const settled = useRef<string | null>(null);
  const callbacks = useRef(props); callbacks.current = props;
  return <View style={[props.style, { overflow: 'hidden' }]} pointerEvents="none">
    {display.activeUrl ? <Image key={activeAttempt.current ?? display.attempt} source={{ uri: display.activeUrl }} cachePolicy="memory" contentFit={props.fit} accessibilityLabel={props.accessibilityLabel} style={StyleSheet.absoluteFill} transition={props.transitionMs} /> : null}
    {display.pendingUrl && display.identity ? <Image key={display.attempt} source={{ uri: display.pendingUrl }} cachePolicy="memory" contentFit={props.fit} style={[StyleSheet.absoluteFill, { opacity: 0 }]} transition={display.activeUrl ? 0 : props.transitionMs} onDisplay={() => {
      if (!accepts(display.identity!, display.attempt)) return;
      if (settled.current === display.identity + ':' + display.attempt) return;
      settled.current = display.identity + ':' + display.attempt;
      activeAttempt.current = display.attempt;
      dispatch({ type: 'loaded', identity: display.identity!, attempt: display.attempt });
      callbacks.current.onReady?.();
    }} onError={() => {
      if (!accepts(display.identity!, display.attempt)) return;
      if (settled.current === display.identity + ':' + display.attempt) return;
      settled.current = display.identity + ':' + display.attempt;
      dispatch({ type: 'failed', identity: display.identity!, attempt: display.attempt });
      callbacks.current.onError?.();
    }} /> : null}
  </View>;
}
