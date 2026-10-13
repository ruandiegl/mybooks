import { useEffect, useRef, useState } from 'react';
import type { SessionActor } from '../auth/sessionActor';
import type { SettingsRoute } from './settingsTypes';
type Options = { actor: SessionActor | null; isBusy: boolean; hasUnsavedChanges: boolean; isDirtyForRoute?: (route: SettingsRoute) => boolean; cropActive: boolean; onCancelCrop(): void; onDiscard(): void };
export function useProfileSettings(options: Options) {
  const [visible, setVisible] = useState(false);
  const [history, setHistory] = useState<SettingsRoute[]>(['menu']);
  const discardIntent = useRef<'back' | 'close'>('back');
  const owner = options.actor ? `${options.actor.userId}:${options.actor.epoch}` : null;
  const captured = useRef(owner);
  useEffect(() => { if (captured.current !== owner) { setVisible(false); setHistory(['menu']); captured.current = owner; } }, [owner]);
  const route = history[history.length - 1];
  function navigateAway(intent: 'back' | 'close') {
    if (options.isBusy) return;
    if (options.cropActive) { options.onCancelCrop(); return; }
    if (route === 'confirmDiscard') { setHistory(old => old.slice(0, -1)); return; }
    const dirty = options.isDirtyForRoute ? options.isDirtyForRoute(route) : options.hasUnsavedChanges && (route === 'editProfile' || route === 'password');
    if (dirty && !(intent === 'back' && route === 'confirmSignOutAll' && history[history.length - 2] === 'password')) {
      discardIntent.current = intent; setHistory(old => [...old, 'confirmDiscard']); return;
    }
    if (intent === 'close' || history.length === 1) setVisible(false);
    else setHistory(old => old.slice(0, -1));
  }
  return {
    visible, route,
    openMenu() { if (!options.actor || options.isBusy) return; captured.current = owner; setHistory(['menu']); setVisible(true); },
    openRoute(next: SettingsRoute) { if (!options.isBusy && options.actor) { setHistory(old => [...old, next]); setVisible(true); } },
    back() { navigateAway('back'); }, requestClose() { navigateAway('close'); },
    confirmDiscard() {
      if (options.isBusy || route !== 'confirmDiscard') return;
      options.onDiscard();
      if (discardIntent.current === 'close') setVisible(false);
      setHistory(old => old.slice(0, -2).length ? old.slice(0, -2) : ['menu']);
    },
    reset() { setVisible(false); setHistory(['menu']); }
  };
}
