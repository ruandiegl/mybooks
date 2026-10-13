// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), userId: 'ana', epoch: 1 }));
vi.mock('react-native', async () => ({ ...(await import('react-native-web')) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('../../../services/api', () => ({ api: { get: io.get, patch: io.patch }, apiErrorMessage: () => 'Não foi possível salvar. Tente novamente.' }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ user: { id: io.userId }, isSignedIn: true, captureActor: () => ({ userId: io.userId, epoch: io.epoch, sessionId: '10000000-0000-4000-8000-000000000001' }), isActorCurrent: (actor: any) => actor.userId === io.userId && actor.epoch === io.epoch }) }));
import { NotificationSettingsPanel } from '../../../components/NotificationSettingsPanel';
import { useAccountPreferences } from '../useAccountPreferences';
function Panel() { return <NotificationSettingsPanel preferences={useAccountPreferences()} />; }
function response(value = true) { return { data: { data: { schemaVersion: 1, userId: io.userId, notifications: { showLikesBadge: value }, capabilities: { changePassword: false, logoutAll: false, push: false } } } }; }
afterEach(() => { cleanup(); vi.resetAllMocks(); io.userId = 'ana'; });
it('rolls back a failed write and offers retry without claiming success', async () => {
  io.get.mockResolvedValue(response()); io.patch.mockRejectedValue(Error('offline'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Panel /></QueryClientProvider>);
  const control = await screen.findByRole('switch', { name: 'Mostrar indicador de novas curtidas' });
  fireEvent.click(control);
  expect(await screen.findByText(/Não foi possível salvar/)).toBeTruthy();
  expect(control.getAttribute('aria-checked')).toBe('true');
  expect(screen.queryByText('Preferência salva')).toBeNull();
  io.patch.mockResolvedValue(response(false));
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Preferência salva')).toBeTruthy();
  expect(control.getAttribute('aria-checked')).toBe('false');
  client.clear();
});
it('does not show a working switch against an older API', async () => {
  io.get.mockRejectedValue({ response: { status: 404 } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Panel /></QueryClientProvider>);
  expect(await screen.findByText(/configuração ainda não está disponível/i)).toBeTruthy();
  expect(screen.queryByRole('switch')).toBeNull(); client.clear();
});
