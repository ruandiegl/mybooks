// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { lightTheme } from '../styles/theme';
const control = vi.hoisted(() => ({ loaded: false, signedIn: false, linking: false }));
vi.mock('react-native', async () => import('react-native-web'));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View }));
vi.mock('../providers/ThemeProvider', () => ({ useAppTheme: () => ({ theme: lightTheme, mode: 'light' }) }));
vi.mock('../providers/SessionProvider', () => ({ useSession: () => ({ isLoaded: control.loaded, isSignedIn: control.signedIn }) }));
vi.mock('@react-navigation/native', () => ({ DarkTheme: { colors: {} }, DefaultTheme: { colors: {} }, NavigationContainer: ({ children, fallback }: any) => control.linking ? fallback : children }));
vi.mock('../routes/linking', () => ({ linking: {} }));
vi.mock('../features/premium/PremiumOfferProvider', () => ({ PremiumOfferProvider: ({ children }: any) => children }));
vi.mock('../routes/app.routes', () => ({ AppRoutes: () => <h1>Área da conta</h1> }));
vi.mock('../routes/authRoutes', () => ({ default: () => <h1>Entrar</h1> }));
import { Routes } from '../routes';
beforeEach(() => { vi.useFakeTimers(); Object.assign(control, { loaded: false, signedIn: false, linking: false }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('explains a slow session without showing login or starting another restore', () => {
  const { rerender } = render(<Routes />);
  expect(screen.getByRole('status').textContent).toContain('Preparando'); expect(screen.queryByText('Entrar')).toBeNull();
  act(() => vi.advanceTimersByTime(9999)); expect(screen.queryByText(/conexão está demorando/)).toBeNull();
  act(() => vi.advanceTimersByTime(1)); expect(screen.getByText(/conexão está demorando/)).toBeTruthy();
  control.loaded = true; control.signedIn = true; rerender(<Routes />);
  expect(screen.getByRole('heading', { name: 'Área da conta' })).toBeTruthy(); expect(screen.queryByRole('status')).toBeNull();
  act(() => vi.advanceTimersByTime(30000)); expect(screen.queryByRole('status')).toBeNull();
});
it('uses branding during initial linking then preserves the unauthenticated route', () => {
  control.loaded = true; control.linking = true; const { rerender } = render(<Routes />);
  expect(screen.getByText('TrocaLivros')).toBeTruthy(); expect(screen.queryByText('Entrar')).toBeNull();
  control.linking = false; rerender(<Routes />); expect(screen.getByRole('heading', { name: 'Entrar' })).toBeTruthy();
});
