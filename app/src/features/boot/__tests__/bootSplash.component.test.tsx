// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { lightTheme, darkTheme } from '../../../styles/theme';
let dark = false;
vi.mock('react-native', async () => import('react-native-web'));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View }));
vi.mock('../../../providers/ThemeProvider', () => ({ useAppTheme: () => ({ theme: dark ? darkTheme : lightTheme, mode: dark ? 'dark' : 'light' }) }));
import { BootSplash } from '../../../components/BootSplash';
import { BootErrorBoundary } from '../../../components/BootErrorBoundary';
beforeEach(() => { vi.useFakeTimers(); dark = false; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('uses a real local image, system text before fonts, and one accessible status', () => {
  const { container } = render(<BootSplash phase="resources" fontsReady={false} />);
  expect(screen.getByRole('status').textContent).toContain('Abrindo');
  expect(screen.getByText('TrocaLivros').style.fontFamily).not.toContain('BeVietnam');
  expect(container.querySelector('img')?.getAttribute('src')).toBe('/brand/boot-mark.svg');
  expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
});
it('uses the dark mark without altering its proportions', () => {
  dark = true; const { container } = render(<BootSplash phase="resources" fontsReady={false} />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('/brand/boot-mark-dark.svg');
  expect(container.querySelector('img')?.getAttribute('width')).toBe('96');
});
it('presents only after the image settles, once under Strict Mode and re-layout', () => {
  const presented = vi.fn(); const { container, rerender } = render(<StrictMode><BootSplash phase="resources" fontsReady={false} onPresented={presented} /></StrictMode>);
  act(() => vi.advanceTimersByTime(32)); expect(presented).not.toHaveBeenCalled();
  fireEvent.load(container.querySelector('img')!); act(() => vi.advanceTimersByTime(32));
  expect(presented).toHaveBeenCalledTimes(1);
  rerender(<StrictMode><BootSplash phase="session" fontsReady onPresented={presented} /></StrictMode>);
  act(() => vi.advanceTimersByTime(100)); expect(presented).toHaveBeenCalledTimes(1);
});
it('a failed image preserves text, releases presentation and offers actionable resource errors', () => {
  const presented = vi.fn(); const { container } = render(<BootSplash phase="resources" fontsReady={false} issue="resource-error" onPresented={presented} />);
  fireEvent.error(container.querySelector('img')!); act(() => vi.advanceTimersByTime(32));
  expect(presented).toHaveBeenCalledTimes(1); expect(screen.getByText('TrocaLivros')).toBeTruthy();
  expect(screen.getByRole('heading').textContent).toContain('Não foi possível');
  expect(screen.getByRole('button', { name: 'Recarregar aplicativo' })).toBeTruthy();
});
it('an error surface is presented even if image loading never completes', () => {
  const presented = vi.fn(); render(<BootSplash phase="resources" fontsReady={false} issue="resource-timeout" onPresented={presented} />);
  act(() => vi.advanceTimersByTime(32)); expect(presented).toHaveBeenCalledTimes(1);
});
it('cancels pending presentation on unmount', () => {
  const presented = vi.fn(); const { container, unmount } = render(<BootSplash phase="resources" fontsReady={false} onPresented={presented} />);
  fireEvent.load(container.querySelector('img')!); unmount(); act(() => vi.advanceTimersByTime(100));
  expect(presented).not.toHaveBeenCalled();
});
it('gives the recovery action a visible keyboard focus without changing its border size', () => {
  render(<BootSplash phase="resources" fontsReady={false} issue="resource-error" />);
  const button = screen.getByRole('button', { name: 'Recarregar aplicativo' });
  const before = getComputedStyle(button).borderTopWidth;
  act(() => button.focus());
  expect(getComputedStyle(button).borderTopWidth).toBe('2px');
  expect(getComputedStyle(button).borderTopColor).toBe('rgb(39, 23, 25)');
  expect(getComputedStyle(button).borderTopWidth).toBe(before);
});
it('catches initial render failures without needing a working theme or custom font', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): React.JSX.Element { throw Error('fixture'); }
  render(<BootErrorBoundary><Broken /></BootErrorBoundary>);
  expect(screen.getByRole('heading').textContent).toContain('Não foi possível');
});
