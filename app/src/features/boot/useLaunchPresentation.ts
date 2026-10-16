import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { releaseLaunchScreen } from './launchScreen';

/** Web commits before the next frame; native also waits for its actual onLayout. */
export function useLaunchPresentation(ready: boolean, onPresented: () => void = releaseLaunchScreen) {
  const [laidOut, setLaidOut] = useState(Platform.OS === 'web');
  const delivered = useRef(false);
  useEffect(() => {
    if (!ready || !laidOut || delivered.current) return;
    const frame = requestAnimationFrame(() => {
      delivered.current = true;
      onPresented();
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, laidOut, onPresented]);
  return () => setLaidOut(true);
}
