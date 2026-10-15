import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { PwaInstallContext } from './PwaInstallContext';
import { getInstallBridge, INSTALL_CHANGED } from './installBridge.web';
import type { InstallOutcome, InstallState } from './pwa.types';
export { usePwaInstall } from './PwaInstallContext';

export function PwaInstallProvider({ children }: PropsWithChildren) {
  const bridge = typeof window === 'undefined' ? null : getInstallBridge();
  const mode = useMemo(() => typeof window === 'undefined' ? null : window.matchMedia?.('(display-mode: standalone)'), []);
  const busy = useRef(false);
  const accepted = useRef(false);
  const alive = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const readState = useCallback((): InstallState => {
    if (!bridge) return 'unavailable';
    if (mode?.matches || navigator.standalone === true) return 'standalone';
    if (bridge.installed) return 'confirmed';
    if (busy.current) return 'prompting';
    if (typeof bridge.pending?.prompt === 'function') return 'ready';
    return accepted.current ? 'accepted' : 'manual';
  }, [bridge, mode]);
  const [state, setState] = useState<InstallState>(readState);
  const sync = useCallback(() => {
    if (!alive.current) return;
    const next = readState(); setState(next);
    if (next === 'confirmed' || next === 'standalone') setError(null);
  }, [readState]);
  useEffect(() => {
    alive.current = true; sync();
    window.addEventListener(INSTALL_CHANGED, sync);
    mode?.addEventListener?.('change', sync);
    return () => { alive.current = false; window.removeEventListener(INSTALL_CHANGED, sync); mode?.removeEventListener?.('change', sync); };
  }, [sync, mode]);
  const requestInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!bridge || busy.current || readState() !== 'ready') return 'unavailable';
    const event = bridge.pending!;
    // The event is one-shot. Consume synchronously, before the first await.
    bridge.pending = null; busy.current = true; setError(null); sync();
    try {
      const prompting = event.prompt();
      await prompting;
      const choice = await event.userChoice;
      accepted.current = choice.outcome === 'accepted';
      return choice.outcome;
    } catch {
      if (alive.current && !bridge.installed) setError('Não foi possível abrir a instalação. Use Como instalar para continuar.');
      return 'error';
    } finally { busy.current = false; sync(); }
  }, [bridge, readState, sync]);
  const value = useMemo(() => ({ state, error, requestInstall }), [state, error, requestInstall]);
  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}
