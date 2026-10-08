// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => ({ ...(await import('react-native-web')), useColorScheme: () => 'light' }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('../themeStorage', () => ({ loadThemePreference: async () => ({ preference: 'light' }), saveThemePreference: async () => {} }));
import { ThemeProvider, useAppTheme } from '../../../providers/ThemeProvider';
import { AppButton } from '../../../components/AppButton';
function Form() {
  const { setPreference } = useAppTheme();
  const [draft, setDraft] = React.useState('livro');
  return <><input aria-label="rascunho" value={draft} onChange={e => setDraft(e.target.value)} />
    <AppButton label="Mudar aparência" onPress={() => { void setPreference('dark'); }} />
  </>;
}
afterEach(cleanup);
it('updates a mounted action and its contrasting label without losing the draft', async () => {
  render(<ThemeProvider><Form /></ThemeProvider>);
  const action = screen.getByRole('button', { name: 'Mudar aparência' });
  fireEvent.change(screen.getByLabelText('rascunho'), { target: { value: 'outro livro' } });
  fireEvent.click(action);
  expect(getComputedStyle(action).backgroundColor).toBe('rgb(255, 143, 181)');
  expect(getComputedStyle(screen.getByText('Mudar aparência')).color).toBe('rgb(39, 23, 25)');
  expect((screen.getByLabelText('rascunho') as HTMLInputElement).value).toBe('outro livro');
});
