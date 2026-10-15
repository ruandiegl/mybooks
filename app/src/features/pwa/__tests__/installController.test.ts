// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PwaInstallProvider, usePwaInstall } from '../PwaInstallProvider.web';
import type { PwaInstallContextValue, DeferredInstallPrompt } from '../pwa.types';

let current: PwaInstallContextValue;
function Consumer() { current = usePwaInstall(); return React.createElement('output', null, current.state); }
function mount() { render(React.createElement(PwaInstallProvider, null, React.createElement(Consumer))); }
let standalone = false;
let modeChanged: () => void;
beforeEach(() => {
  standalone = false;
  window.__trocalivrosPwaInstallBridge = { pending: null, installed: false };
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({
    get matches() { return standalone; }, addEventListener: (_: string, fn: () => void) => { modeChanged = fn; }, removeEventListener() {},
  }) });
});
afterEach(() => { cleanup(); delete window.__trocalivrosPwaInstallBridge; delete (navigator as any).standalone; });
function offer(outcome: 'accepted' | 'dismissed' = 'dismissed', prompt = vi.fn().mockResolvedValue(undefined)) {
  const event = Object.assign(new Event('beforeinstallprompt'), { prompt, userChoice: Promise.resolve({ outcome, platform: 'web' }) }) as DeferredInstallPrompt;
  window.__trocalivrosPwaInstallBridge!.pending = event;
  return event;
}
it('consumes the early captured prompt once, synchronously, even on double click', async () => {
  const event = offer(); mount();
  expect(screen.getByText('ready')).toBeTruthy();
  let first!: Promise<string>, second!: Promise<string>;
  act(() => { first = current.requestInstall(); second = current.requestInstall(); expect(event.prompt).toHaveBeenCalledTimes(1); });
  await act(async () => { expect(await first).toBe('dismissed'); expect(await second).toBe('unavailable'); });
  expect(screen.getByText('manual')).toBeTruthy();
  expect(window.__trocalivrosPwaInstallBridge!.pending).toBeNull();
});
it('requires a new event after dismissing, without automatically reopening anything', async () => {
  offer(); mount(); await act(async () => { await current.requestInstall(); });
  expect(await current.requestInstall()).toBe('unavailable');
  act(() => { offer('accepted'); window.dispatchEvent(new Event('trocalivros:pwa-install-change')); });
  await act(async () => { expect(await current.requestInstall()).toBe('accepted'); });
  expect(screen.getByText('accepted')).toBeTruthy();
});
it('recovers to the manual guide when prompting throws', async () => {
  offer('dismissed', vi.fn().mockRejectedValue(new Error('denied'))); mount();
  await act(async () => { expect(await current.requestInstall()).toBe('error'); });
  expect(current.error).toContain('Como instalar'); expect(current.state).toBe('manual');
});
it('does not regress confirmed installation when userChoice finishes later', async () => {
  let finish!: (value: any) => void;
  const event = offer('accepted'); event.userChoice = new Promise(resolve => { finish = resolve; }); mount();
  let request!: Promise<string>;
  act(() => { request = current.requestInstall(); window.__trocalivrosPwaInstallBridge!.installed = true; window.dispatchEvent(new Event('trocalivros:pwa-install-change')); });
  await act(async () => { finish({ outcome: 'accepted', platform: 'web' }); await request; });
  expect(current.state).toBe('confirmed');
});
it.each(['media', 'ios'])('suppresses promotion in standalone mode (%s)', kind => {
  offer(); if (kind === 'media') standalone = true; else Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
  mount(); expect(current.state).toBe('standalone');
});
it('updates when display mode changes and does not assume installation elsewhere', () => {
  mount(); expect(current.state).toBe('manual');
  act(() => { standalone = true; modeChanged(); }); expect(current.state).toBe('standalone');
});
it('clears a previous prompt error when installation is subsequently confirmed', async () => {
  offer('dismissed', vi.fn().mockRejectedValue(new Error('denied'))); mount();
  await act(async () => { await current.requestInstall(); }); expect(current.error).not.toBeNull();
  act(() => { window.__trocalivrosPwaInstallBridge!.installed = true; window.dispatchEvent(new Event('trocalivros:pwa-install-change')); });
  expect(current.state).toBe('confirmed'); expect(current.error).toBeNull();
});
