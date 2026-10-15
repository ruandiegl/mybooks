import type { DeferredInstallPrompt, InstallBridge } from './pwa.types';

export const INSTALL_CHANGED = 'trocalivros:pwa-install-change';
// Also support Expo's development HTML, which may not use the exported template.
export function getInstallBridge(): InstallBridge {
  if (!window.__trocalivrosPwaInstallBridge) {
    const bridge: InstallBridge = { pending: null, installed: false };
    window.__trocalivrosPwaInstallBridge = bridge;
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault(); bridge.pending = event as DeferredInstallPrompt;
      window.dispatchEvent(new Event(INSTALL_CHANGED));
    });
    window.addEventListener('appinstalled', () => {
      bridge.installed = true; bridge.pending = null;
      window.dispatchEvent(new Event(INSTALL_CHANGED));
    });
  }
  return window.__trocalivrosPwaInstallBridge;
}
