import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

const motion = { enter: 250, exit: 180, initialScale: 0.82 };

export function useAvatarPhotoMotion(visible: boolean, blocked: boolean, cropping: boolean) {
  const active = visible && !cropping;
  const wasVisible = useRef(false);
  const progress = useRef(new Animated.Value(1)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const pendingClose = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const reduced = useRef(true); // Unknown/unsupported preference: no movement, never a delayed reveal.
  const current = useRef({ active, blocked });
  current.current = { active, blocked };
  const [closing, setClosing] = useState(false);

  const stop = useCallback(() => {
    generation.current++;
    pendingClose.current = null;
    animation.current?.stop();
    animation.current = null;
  }, []);

  useEffect(() => {
    let alive = true;
    let changed = false;
    const update = (enabled: boolean) => {
      if (!alive) return;
      reduced.current = enabled;
      if (!enabled) return;
      const finish = pendingClose.current;
      stop();
      progress.setValue(1);
      setClosing(false);
      if (current.current.active && !current.current.blocked) finish?.();
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!changed) update(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      update(value);
    });
    return () => { alive = false; subscription?.remove(); stop(); };
  }, [progress, stop]);

  useLayoutEffect(() => {
    const opening = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (!active || blocked) {
      stop();
      progress.setValue(1);
      setClosing(false);
    } else if (opening) {
      // Native onShow is emitted after presentation; prepare before the first visible frame.
      stop();
      progress.setValue(reduced.current ? 1 : 0);
      setClosing(false);
    }
  }, [visible, active, blocked, progress, stop]);

  const open = useCallback(() => {
    if (!current.current.active || pendingClose.current) return;
    stop();
    if (reduced.current) { progress.setValue(1); return; }
    animation.current = Animated.timing(progress, {
      toValue: 1, duration: motion.enter, easing: Easing.out(Easing.back(1.12)),
      useNativeDriver: Platform.OS !== 'web', isInteraction: false
    });
    animation.current.start();
  }, [progress, stop]);

  const dismiss = useCallback((finish: () => void) => {
    if (!current.current.active || current.current.blocked || pendingClose.current) return;
    stop();
    if (reduced.current) { finish(); return; }
    pendingClose.current = finish;
    setClosing(true);
    const run = generation.current;
    animation.current = Animated.timing(progress, {
      toValue: 0, duration: motion.exit, easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web', isInteraction: false
    });
    animation.current.start(({ finished }) => {
      if (!finished || run !== generation.current) return;
      const callback = pendingClose.current;
      pendingClose.current = null;
      if (current.current.active && !current.current.blocked) callback?.();
    });
  }, [progress, stop]);

  return {
    open, dismiss, closing,
    backdropOpacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.94], extrapolate: 'clamp' }),
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    scale: progress.interpolate({ inputRange: [0, 1], outputRange: [motion.initialScale, 1] })
  };
}
