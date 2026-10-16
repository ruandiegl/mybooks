// @vitest-environment jsdom
import React, { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { lightTheme } from '../styles/theme';
const control = vi.hoisted(() => ({ hydrated: false, fonts: false, fontError: null as Error | null, boots: 0, stops: 0, release: vi.fn() }));
vi.mock('react-native', async () => import('react-native-web'));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaProvider: ({ children }: any) => children, SafeAreaView: (await import('react-native-web')).View }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('../providers/ThemeProvider', () => ({ ThemeProvider: ({ children }: any) => children, useAppTheme: () => ({ theme: lightTheme, mode: 'light', hydrated: control.hydrated }) }));
vi.mock('@expo-google-fonts/be-vietnam-pro', () => ({ useFonts: () => [control.fonts, control.fontError], BeVietnamPro_400Regular: 1, BeVietnamPro_500Medium: 1, BeVietnamPro_600SemiBold: 1, BeVietnamPro_700Bold: 1, BeVietnamPro_800ExtraBold: 1 }));
vi.mock('../features/boot/launchScreen', () => ({ releaseLaunchScreen: control.release }));
vi.mock('../features/pwa/PwaInstallProvider', () => ({ PwaInstallProvider: ({ children }: any) => children }));
vi.mock('../providers/SessionProvider', () => ({ SessionProvider: ({ children }: any) => { useEffect(() => { control.boots++; return () => { control.stops++; }; }, []); return children; } }));
vi.mock('../routes', () => ({ Routes: () => { const [value, set] = useState(''); return <input aria-label="Rascunho" value={value} onChange={event => set(event.target.value)} />; } }));
import App from '../../App';
beforeEach(() => {
  vi.useFakeTimers(); Object.assign(control, { hydrated: false, fonts: false, fontError: null, boots: 0, stops: 0 }); control.release.mockReset();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('shows branding during theme hydration and releases the previous launch surface before session boot', () => {
  const { container } = render(<App />); expect(screen.getByText('TrocaLivros')).toBeTruthy(); expect(control.boots).toBe(0);
  fireEvent.load(container.querySelector('img')!); act(() => vi.advanceTimersByTime(32)); expect(control.release).toHaveBeenCalled();
});
it('does not remain on a launch overlay when every resource is immediately ready', () => {
  control.hydrated = true; control.fonts = true; render(<App />);
  act(() => vi.advanceTimersByTime(32)); expect(control.release).toHaveBeenCalled(); expect(screen.getByLabelText('Rascunho')).toBeTruthy();
});
it('preserves the runtime and draft after a late font signal', () => {
  control.hydrated = true; control.fonts = true; const { rerender } = render(<App />);
  fireEvent.change(screen.getByLabelText('Rascunho'), { target: { value: 'Livro novo' } });
  control.fonts = false; control.fontError = Error('late'); rerender(<App />);
  expect((screen.getByLabelText('Rascunho') as HTMLInputElement).value).toBe('Livro novo'); expect(control.boots).toBe(1); expect(control.stops).toBe(0);
});
it('font error and pending theme explain failure without starting a private runtime', () => {
  control.fontError = Error('font'); render(<App />);
  expect(screen.getByRole('heading').textContent).toContain('Não foi possível'); expect(control.boots).toBe(0);
});
it('releases the launch layer on wide boot while keeping the private runtime absent', () => {
  control.hydrated = true; control.fonts = true;
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  render(<App />); act(() => vi.advanceTimersByTime(32));
  expect(screen.getByRole('heading', { name: 'Continue no celular ou tablet' })).toBeTruthy();
  expect(control.boots).toBe(0); expect(control.release).toHaveBeenCalled();
});
