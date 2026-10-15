// @vitest-environment jsdom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => import('react-native-web'));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
import { PwaInstallAction } from '../components/PwaInstallAction/index.web';
import { PwaInstallPanel } from '../components/PwaInstallPanel/index.web';
import { PwaInstallProvider } from '../features/pwa/PwaInstallProvider.web';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal';
import { DesktopAccessNotice } from '../components/DesktopAccessNotice/index.web';
import type { GuidePlatform } from '../features/pwa/pwa.types';
import type { SettingsRoute } from '../features/settings/settingsTypes';

beforeEach(() => {
  window.__trocalivrosPwaInstallBridge = { pending: null, installed: false };
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); delete window.__trocalivrosPwaInstallBridge; });
it('opens a manual guide and allows switching to the iPhone menu instructions', () => {
  render(<PwaInstallProvider><PwaInstallAction /></PwaInstallProvider>);
  const trigger = screen.getByRole('button', { name: 'Como instalar' }); trigger.focus(); fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: 'Instalar TrocaLivros' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'iPhone/iPad' }));
  expect(screen.getByText(/Adicionar à Tela de Início/)).toBeTruthy();
  expect(screen.getByText(/Compartilhar/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar guia de instalação' }));
  expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(trigger);
});
it('uses the captured prompt directly and does not open a guide after dismissal', async () => {
  const prompt = vi.fn().mockResolvedValue(undefined);
  window.__trocalivrosPwaInstallBridge!.pending = Object.assign(new Event('beforeinstallprompt'), { prompt, userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' }) });
  render(<PwaInstallProvider><PwaInstallAction /></PwaInstallProvider>);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Instalar TrocaLivros' })); });
  expect(prompt).toHaveBeenCalledTimes(1); expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Como instalar' })).toBeTruthy();
});
it('hides promotion after installation but keeps installation help available', () => {
  window.__trocalivrosPwaInstallBridge!.installed = true;
  render(<PwaInstallProvider><PwaInstallAction /><PwaInstallPanel platform="ios" onPlatformChange={() => {}} /></PwaInstallProvider>);
  expect(screen.queryByRole('button', { name: 'Instalar TrocaLivros' })).toBeNull();
  expect(screen.getByText(/já está disponível como aplicativo/)).toBeTruthy();
});
it('does not offer installation on this computer inside the wide handoff guide', () => {
  window.__trocalivrosPwaInstallBridge!.pending = Object.assign(new Event('beforeinstallprompt'), { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' }) });
  render(<PwaInstallProvider><PwaInstallPanel platform="ios" onPlatformChange={() => {}} allowDirectInstall={false} /></PwaInstallProvider>);
  expect(screen.queryByRole('button', { name: 'Instalar TrocaLivros' })).toBeNull();
  expect(screen.getByText(/Adicionar à Tela de Início/)).toBeTruthy();
});
it('hosts installation in the existing settings modal instead of nesting a dialog', async () => {
  function Settings() {
    const [route, setRoute] = useState<SettingsRoute>('menu'); const [platform, setPlatform] = useState<GuidePlatform>('android');
    return <ProfileSettingsModal visible route={route} busy={false} onBack={() => setRoute('menu')} onClose={() => {}} onRoute={setRoute} available={['help', 'install']}>
      <PwaInstallPanel platform={platform} onPlatformChange={setPlatform} />
    </ProfileSettingsModal>;
  }
  render(<PwaInstallProvider><Settings /></PwaInstallProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Instalar aplicativo' }));
  expect(await screen.findByRole('dialog', { name: 'Instalar aplicativo' })).toBeTruthy();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
});
it('keeps a selectable public URL when copying fails', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  render(<DesktopAccessNotice onShowGuide={() => {}} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copiar link' })); });
  expect(screen.getByRole('status').textContent).toContain('Selecione o link');
  expect(screen.getByRole('link').getAttribute('href')).toBe('http://localhost:3000/');
  expect(screen.getByRole('img', { name: /QR code/ })).toBeTruthy();
});
