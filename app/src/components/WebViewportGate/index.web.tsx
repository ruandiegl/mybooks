import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MOBILE_MEDIA_QUERY } from '../../features/pwa/viewportPolicy';
import { useAppTheme } from '../../providers/ThemeProvider';

type Access = 'allowed' | 'wide' | 'unsupported';
function readAccess(): Access {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    || typeof HTMLDialogElement === 'undefined' || typeof HTMLDialogElement.prototype.showModal !== 'function') return 'unsupported';
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches ? 'allowed' : 'wide';
}
export function WebViewportGate({ children, notice }: { children: ReactNode; notice: ReactNode }) {
  const { theme } = useAppTheme();
  const [access, setAccess] = useState<Access>(readAccess);
  const entered = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const runtime = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  if (access === 'allowed') entered.current = true;
  useLayoutEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(MOBILE_MEDIA_QUERY);
    const update = () => {
      const next = readAccess();
      // Capture before React hides the host, which would blur its focused input.
      if (next === 'wide' && !dialog.current?.open) previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setAccess(next);
    };
    query.addEventListener?.('change', update); update();
    return () => query.removeEventListener?.('change', update);
  }, []);
  useLayoutEffect(() => {
    const surface = dialog.current;
    if (!surface) return;
    if (access === 'wide' && !surface.open) {
      if (!previousFocus.current) previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      surface.showModal();
      const heading = surface.querySelector<HTMLElement>('h1');
      heading?.setAttribute('tabindex', '-1'); heading?.focus();
    } else if (access !== 'wide' && surface.open) {
      surface.close();
      const target = previousFocus.current;
      if (target?.isConnected && target !== document.body && !target.closest('[hidden]')) target.focus({ preventScroll: true });
      else (runtime.current?.querySelector<HTMLElement>('h1,[role="heading"]') || runtime.current)?.focus({ preventScroll: true });
    }
  }, [access]);
  // The dialog is a sibling of the hidden runtime. Its top layer also covers RN Web portals.
  return <>
    {entered.current ? <div ref={runtime} tabIndex={-1} hidden={access !== 'allowed'} style={{ display: access === 'allowed' ? 'flex' : 'none', flex: 1, minHeight: 0, width: '100%', height: '100%' }}>{children}</div> : null}
    {access === 'unsupported' ? <main style={{ padding: theme.spacing.lg, color: theme.colors.foreground, background: theme.colors.background, width: '100%', overflow: 'auto', fontFamily: theme.typography.regular }}>
      <h1>Atualize seu navegador</h1><p>Abra o TrocaLivros em uma versão atual do Safari, Chrome ou Edge no celular ou tablet para continuar.</p>
    </main> : null}
    <dialog ref={dialog} className="tl-viewport-gate" aria-label="Acesso ao TrocaLivros em telas menores" onCancel={event => event.preventDefault()} style={{ border: 0, padding: 0, margin: 0, maxWidth: 'none', maxHeight: 'none', width: '100%', height: '100%', background: theme.colors.background, color: theme.colors.foreground }}>
      {access === 'wide' ? notice : null}
    </dialog>
    <style>{`.tl-viewport-gate{box-sizing:border-box;overflow:auto;overscroll-behavior:contain}.tl-viewport-gate::backdrop{background:${theme.colors.background}}@supports(height:100dvh){.tl-viewport-gate{height:100dvh!important}}`}</style>
  </>;
}
