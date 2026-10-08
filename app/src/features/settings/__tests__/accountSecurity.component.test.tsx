// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ change: vi.fn(), epoch: 1 }));
vi.mock('react-native', async () => ({ ...(await import('react-native-web')) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('../../../providers/SessionProvider', () => ({ useSession: () => ({ user: { id: 'ana', email: 'ana@example.test', emailVerifiedAt: '2026-10-08', phone: '+5511999999999' }, captureActor: () => ({ userId: 'ana', epoch: io.epoch, sessionId: '10000000-0000-4000-8000-000000000001' }), isActorCurrent: (actor: any) => actor.epoch === io.epoch, changePassword: io.change, signOutAll: async () => {}, signOut: async () => {} }) }));
vi.mock('../../../services/api', () => ({ apiErrorMessage: (_error: unknown, fallback: string) => fallback }));
import { PasswordChangeForm } from '../../../components/PasswordChangeForm';
import { useAccountSecurity } from '../../auth/useAccountSecurity';
import { AccountSettingsPanel } from '../../../components/AccountSettingsPanel';
function Form() { return <PasswordChangeForm security={useAccountSecurity()} enabled />; }
afterEach(() => { cleanup(); vi.resetAllMocks(); io.epoch = 1; });
function fill(confirmation = 'NovaSenha@123') {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'Senha@123' } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'NovaSenha@123' } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirmation } });
}
it('blocks unequal confirmation and preserves a wrong-current-password error without signing out', async () => {
  io.change.mockRejectedValue({ response: { status: 403, data: { error: { code: 'CURRENT_PASSWORD_INVALID' } } } });
  render(<Form />); fill('diferente');
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));
  expect(screen.getByText('As senhas não coincidem.')).toBeTruthy(); expect(io.change).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'NovaSenha@123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));
  expect(await screen.findByText('A senha atual está incorreta.')).toBeTruthy();
  expect((screen.getByLabelText('Nova senha') as HTMLInputElement).value).toBe('NovaSenha@123');
});
it('allows paste/managers and rejects an oversized UTF8 password before sending', () => {
  render(<Form />); fill();
  expect(screen.getByLabelText('Senha atual').getAttribute('autocomplete')).toBe('current-password');
  expect(screen.getByLabelText('Nova senha').getAttribute('autocomplete')).toBe('new-password');
  const oversized = 'Áa1!' + 'é'.repeat(36);
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: oversized } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: oversized } });
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }));
  expect(screen.getByText('A senha deve ter no máximo 72 bytes UTF-8.')).toBeTruthy();
  expect(io.change).not.toHaveBeenCalled();
});
it('only shows permitted account fields, never CPF or credentials', () => {
  render(<AccountSettingsPanel />);
  expect(screen.getByText('ana@example.test')).toBeTruthy(); expect(screen.getByText('E-mail confirmado')).toBeTruthy();
  expect(screen.queryByText(/CPF|token|hash|R2/)).toBeNull();
});
