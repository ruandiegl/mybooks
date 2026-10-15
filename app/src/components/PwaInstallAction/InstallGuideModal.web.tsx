import { useLayoutEffect, useRef } from 'react';
import { PwaInstallSettingsPanel } from '../PwaInstallPanel/index.web';
import { installStyles } from '../PwaInstallPanel/styles.web';
import { useAppTheme } from '../../providers/ThemeProvider';

export function InstallGuideModal({ onClose }: { onClose(): void }) {
  const { theme } = useAppTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const handleClose = useRef(onClose); handleClose.current = onClose;
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const surface = dialog.current;
    if (!surface || typeof surface.showModal !== 'function') return;
    surface.showModal(); close.current?.focus({ preventScroll: true }); surface.scrollTop = 0;
    return () => { surface.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="tl-install-sheet" aria-labelledby="tl-install-title" onCancel={event => { event.preventDefault(); handleClose.current(); }} onClick={event => { if (event.target === event.currentTarget) {
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) handleClose.current();
  } }}>
    <style>{installStyles(theme)}</style><div className="tl-install-handle" aria-hidden="true" />
    <div className="tl-install-sheet-inner"><header className="tl-install-header"><h2 id="tl-install-title">Instalar TrocaLivros</h2><button ref={close} className="tl-install-close" type="button" aria-label="Fechar guia de instalação" onClick={onClose}>×</button></header>
      <PwaInstallSettingsPanel />
    </div>
  </dialog>;
}
