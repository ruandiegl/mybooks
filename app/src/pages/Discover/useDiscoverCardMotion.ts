import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

export type DiscoverAction = 'LIKE' | 'PASS';
const motion = { exit: 240, enter: 160, feedbackOpacity: 0.46, feedbackTravel: 48 };
const driver = { useNativeDriver: Platform.OS !== 'web', isInteraction: false };

export function useDiscoverCardMotion(focused: boolean, width: number, height: number) {
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const feedback = useRef(new Animated.Value(0)).current;
  const reduced = useRef(true);
  const current = useRef({ focused, width }); current.current = { focused, width };
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleExit = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const [action, setAction] = useState<DiscoverAction | null>(null);
  const [exited, setExited] = useState(false);

  const stop = useCallback(() => {
    generation.current++;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    const settle = settleExit.current; settleExit.current = null;
    animation.current?.stop(); animation.current = null;
    settle?.();
  }, []);
  const reset = useCallback(() => {
    stop(); pan.setValue({ x: 0, y: 0 }); opacity.setValue(1); feedback.setValue(0); setAction(null); setExited(false);
  }, [stop, pan, opacity, feedback]);

  useEffect(() => {
    let alive = true, changed = false;
    const update = (value: boolean) => { if (!alive) return; reduced.current = value; if (value) reset(); };
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (!changed) update(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; update(value); });
    return () => { alive = false; subscription?.remove(); stop(); };
  }, [reset, stop]);
  useLayoutEffect(() => { if (!focused) reset(); }, [focused, reset]);
  useLayoutEffect(() => { reset(); }, [width, height, reset]);

  const exit = useCallback((nextAction: DiscoverAction): Promise<void> => {
    stop();
    if (reduced.current || !current.current.focused) { reset(); return Promise.resolve(); }
    setAction(nextAction); setExited(false); feedback.setValue(0);
    const direction = nextAction === 'LIKE' ? 1 : -1;
    const destination = { x: direction * (current.current.width + 96), y: 0 };
    const run = generation.current;
    return new Promise(resolve => {
      settleExit.current = resolve;
      const finish = () => {
        if (run !== generation.current) return;
        if (timeout.current) clearTimeout(timeout.current); timeout.current = null;
        animation.current?.stop(); animation.current = null;
        pan.setValue(destination); opacity.setValue(0); feedback.setValue(1);
        setExited(true);
        const settle = settleExit.current; settleExit.current = null; settle?.();
      };
      animation.current = Animated.parallel([
        Animated.timing(pan, { toValue: destination, duration: motion.exit, easing: Easing.in(Easing.quad), ...driver }),
        Animated.timing(opacity, { toValue: 0, duration: motion.exit, easing: Easing.in(Easing.quad), ...driver }),
        Animated.timing(feedback, { toValue: 1, duration: motion.exit, easing: Easing.linear, ...driver })
      ]);
      // The API result never depends solely on a native animation-end callback.
      timeout.current = setTimeout(finish, motion.exit + 32);
      animation.current.start(({ finished }) => { if (finished) finish(); });
    });
  }, [stop, reset, feedback, pan, opacity]);

  const prepareNext = useCallback(() => {
    reset(); opacity.setValue(reduced.current || !current.current.focused ? 1 : 0);
  }, [reset, opacity]);
  const enter = useCallback(() => {
    stop();
    if (reduced.current || !current.current.focused) { opacity.setValue(1); return; }
    const run = generation.current;
    const finish = () => {
      if (run !== generation.current) return;
      if (timeout.current) clearTimeout(timeout.current); timeout.current = null;
      animation.current?.stop(); animation.current = null; opacity.setValue(1);
    };
    animation.current = Animated.timing(opacity, { toValue: 1, duration: motion.enter, easing: Easing.out(Easing.quad), ...driver });
    timeout.current = setTimeout(finish, motion.enter + 32);
    animation.current.start(({ finished }) => { if (finished) finish(); });
  }, [stop, opacity]);
  const returnCard = useCallback(() => { prepareNext(); enter(); }, [prepareNext, enter]);

  return { pan, opacity, action, exited, exit, prepareNext, enter, reset, returnCard,
    canMove: () => !reduced.current && current.current.focused,
    feedbackOpacity: feedback.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [0, motion.feedbackOpacity, motion.feedbackOpacity * 0.9, 0], extrapolate: 'clamp' }),
    feedbackTranslateX: feedback.interpolate({ inputRange: [0, 1], outputRange: [0, (action === 'LIKE' ? 1 : -1) * motion.feedbackTravel], extrapolate: 'clamp' })
  };
}
