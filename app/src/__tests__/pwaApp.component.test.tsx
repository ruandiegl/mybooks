// @vitest-environment jsdom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const control = vi.hoisted(() => ({ allowed: false, boots: 0, listeners: new Set<() => void>(), complete: null as null | (() => void) }));
vi.mock('react-native', async () => import('react-native-web'));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaProvider: ({ children }: any) => children, SafeAreaView: (await import('react-native-web')).View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('../features/pwa/PwaInstallProvider', () => import('../features/pwa/PwaInstallProvider.web'));
vi.mock('@expo-google-fonts/be-vietnam-pro', () => ({ useFonts: () => [true], BeVietnamPro_400Regular: 1, BeVietnamPro_500Medium: 1, BeVietnamPro_600SemiBold: 1, BeVietnamPro_700Bold: 1, BeVietnamPro_800ExtraBold: 1 }));
vi.mock('../providers/ThemeProvider', async () => ({ ThemeProvider: ({ children }: any) => children, useAppTheme: () => ({ theme: (awaitTheme), mode: 'light', hydrated: true }) }));
import { lightTheme as awaitTheme } from '../styles/theme';
vi.mock('../providers/SessionProvider', () => ({ SessionProvider: ({ children }: any) => { control.boots++; return children; }, useSession: () => ({ establishSession: async () => {}, sessionNotice: undefined }) }));
vi.mock('../features/auth/authApi', () => ({ authApi: {}, authErrorMessage: () => '' }));
vi.mock('../routes', () => ({ Routes: () => <Runtime /> }));
import App from '../../App';
import { Auth } from '../pages/Auth';
import { MatchModal } from '../components/MatchModal';

function Runtime() {
  const [value, setValue] = useState(''); const [result, setResult] = useState(''); const [match, setMatch] = useState(false);
  return <><Auth /><input aria-label="Livro em edição" value={value} onChange={e => setValue(e.target.value)} />
    <button onClick={() => { void new Promise<void>(resolve => { control.complete = resolve; }).then(() => setResult('Fotos salvas')); }}>Iniciar upload</button><output>{result}</output>
    <button onClick={() => setMatch(true)}>Abrir match</button><MatchModal visible={match} reduceMotion onClose={() => setMatch(false)} onMessages={() => {}} /></>;
}
beforeEach(() => {
  control.allowed = false; control.boots = 0; control.listeners.clear(); control.complete = null;
  window.__trocalivrosPwaInstallBridge = { pending: null, installed: false };
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({ get matches() { return query.includes('max-width') && control.allowed; }, addEventListener: (_: string, fn: () => void) => { if (query.includes('max-width')) control.listeners.add(fn); }, removeEventListener: (_: string, fn: () => void) => { control.listeners.delete(fn); } }) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); delete window.__trocalivrosPwaInstallBridge; });
function resize(allowed: boolean) { act(() => { control.allowed = allowed; control.listeners.forEach(fn => fn()); }); }
it('does not initialize the session on wide boot, and preserves the original deep link', () => {
  history.replaceState({}, '', '/books/123?from=share'); render(<App />);
  expect(control.boots).toBe(0); expect(screen.getByRole('heading', { name: 'Continue no celular ou tablet' })).toBeTruthy();
  expect(location.pathname + location.search).toBe('/books/123?from=share');
});
it('offers installation on the actual auth landing only, not inside the login form', () => {
  control.allowed = true; render(<App />); expect(screen.getByRole('button', { name: 'Como instalar' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Já tenho uma conta' }));
  expect(screen.queryByRole('button', { name: 'Como instalar' })).toBeNull();
});
it('preserves an input and completion of a pending upload without restarting the session', async () => {
  control.allowed = true; render(<App />);
  const field = screen.getByLabelText('Livro em edição'); fireEvent.change(field, { target: { value: 'Dom Casmurro' } });
  fireEvent.click(screen.getByText('Iniciar upload')); resize(false);
  await act(async () => { control.complete!(); }); resize(true);
  expect((screen.getByLabelText('Livro em edição') as HTMLInputElement).value).toBe('Dom Casmurro');
  expect(screen.getByText('Fotos salvas')).toBeTruthy(); expect(control.boots).toBe(1);
});
it('keeps a real existing modal mounted while presenting the policy gate', async () => {
  control.allowed = true; render(<App />); fireEvent.click(screen.getByText('Abrir match'));
  const match = await screen.findByRole('dialog', { name: 'Deu match!' }); resize(false);
  expect(screen.getByRole('dialog', { name: 'Acesso ao TrocaLivros em telas menores' })).toBeTruthy();
  expect(match.isConnected).toBe(true); resize(true); expect(match.isConnected).toBe(true);
});
