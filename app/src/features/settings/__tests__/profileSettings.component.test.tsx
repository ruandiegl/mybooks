// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => ({ ...(await import('react-native-web')) }));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
import { ProfileSettingsModal } from '../../../components/ProfileSettingsModal';
import { AppearanceSettingsPanel } from '../../../components/AppearanceSettingsPanel';
afterEach(cleanup);
it('shows one named host, real sections and clear navigation', async () => {
  const events: string[] = [];
  render(<ProfileSettingsModal visible route="menu" busy={false} onBack={() => events.push('back')} onClose={() => events.push('close')} onRoute={value => events.push(value)} available={['editProfile', 'appearance']} />);
  expect(await screen.findByRole('dialog', { name: 'Configurações' })).toBeTruthy();
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aparência' }));
  expect(events).toEqual(['editProfile', 'appearance']);
  expect(screen.queryByRole('button', { name: 'Notificações' })).toBeNull();
});
it('provides explicit light/dark/system choices', () => {
  render(<AppearanceSettingsPanel />);
  for (const name of ['Claro', 'Escuro', 'Usar tema do dispositivo']) expect(screen.getByRole('radio', { name })).toBeTruthy();
});
