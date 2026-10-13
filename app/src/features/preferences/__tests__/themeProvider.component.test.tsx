// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const io = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), scheme: 'dark' as string | null }));
vi.mock('react-native', async () => ({ ...(await import('react-native-web')), useColorScheme: () => io.scheme }));
vi.mock('../themeStorage', () => ({ loadThemePreference: io.load, saveThemePreference: io.save }));
import { ThemeProvider, useAppTheme } from '../../../providers/ThemeProvider';
function Probe() {
  const value = useAppTheme();
  const [draft, setDraft] = React.useState('rascunho');
  return <><output>{value.mode}</output><input aria-label="draft" value={draft} onChange={e => setDraft(e.target.value)} />
    <button onClick={() => { void value.setPreference('light'); }}>Claro</button>
    <button onClick={() => { void value.setPreference('dark'); }}>Escuro</button>
    <span>{value.persistenceError}</span></>;
}
afterEach(() => { cleanup(); document.querySelectorAll('meta[name="theme-color"]').forEach(element => element.remove()); vi.resetAllMocks(); io.scheme = 'dark'; });
describe('appearance provider', () => {
  it('updates all exported browser-chrome metadata, including Expo injected tags', async () => {
    for (let n = 0; n < 2; n++) { const tag = document.createElement('meta'); tag.name = 'theme-color'; tag.content = '#B90041'; document.head.append(tag); }
    io.load.mockResolvedValue({ preference: 'dark' });
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await screen.findByText('dark');
    expect(Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')).map(tag => tag.content)).toEqual(['#181318', '#181318']);
  });
  it('uses the device and changes a mounted tree without resetting drafts', async () => {
    io.load.mockResolvedValue({ preference: 'system' }); io.save.mockResolvedValue(undefined);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await screen.findByText('dark');
    fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'nome novo' } });
    fireEvent.click(screen.getByText('Claro'));
    expect(screen.getByText('light')).toBeTruthy();
    expect((screen.getByLabelText('draft') as HTMLInputElement).value).toBe('nome novo');
  });
  it('does not let late hydration overwrite a user choice', async () => {
    let resolve!: (value: { preference: 'dark' }) => void;
    io.load.mockReturnValue(new Promise(r => { resolve = r; })); io.save.mockResolvedValue(undefined);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByText('Claro'));
    await act(async () => { resolve({ preference: 'dark' }); });
    expect(screen.getByText('light')).toBeTruthy();
  });
  it('falls back to light if the system reports no scheme', async () => {
    io.scheme = null; io.load.mockResolvedValue({ preference: 'system' });
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(await screen.findByText('light')).toBeTruthy();
  });
  it('keeps the choice usable and shows a persistence failure', async () => {
    io.load.mockResolvedValue({ preference: 'system' }); io.save.mockRejectedValue(new Error('blocked'));
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByText('Claro'));
    expect(await screen.findByText(/não foi possível salvar/i)).toBeTruthy();
    expect(screen.getByText('light')).toBeTruthy();
  });
});
