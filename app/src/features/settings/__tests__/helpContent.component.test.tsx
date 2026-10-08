// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => await import('react-native-web'));
import { ProfileHelpPanel } from '../../../components/ProfileHelpPanel';
import { AboutAppPanel } from '../../../components/AboutAppPanel';
afterEach(cleanup);
it('describes the real photo/covers/likes behavior without invented links', () => {
  render(<ProfileHelpPanel />);
  expect(screen.getByText(/primeira foto.*capa/i)).toBeTruthy(); expect(screen.getByText(/até 3 fotos/i)).toBeTruthy();
  expect(screen.getByText(/aba Curtidas.*centro/i)).toBeTruthy(); expect(screen.queryByRole('link')).toBeNull();
});
it('shows the application version, not the Expo Go version or infrastructure identifiers', () => {
  render(<AboutAppPanel />);
  expect(screen.getByText('TrocaLivros')).toBeTruthy(); expect(screen.getByText(/Versão 1\.0\.0/)).toBeTruthy();
  expect(screen.queryByText(/Railway|R2|Expo Go|token|projectId/i)).toBeNull(); expect(screen.queryByRole('link')).toBeNull();
});
