// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => await import('react-native-web'));
// OS font bridge renders an actual glyph; semantics must come from the real button.
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: (props: any) => <span aria-hidden={props['aria-hidden']}></span> }));
import { AppButton } from '../../../components/AppButton';
afterEach(cleanup);
it('keeps decorative icon glyphs out of the action name', () => {
  render(<AppButton label="Atualizar senha" icon="lock-outline" />);
  expect(screen.getByRole('button', { name: /^Atualizar senha$/ })).toBeTruthy();
});
it('preserves a more descriptive label supplied by the caller', () => {
  render(<AppButton label="Adicionar" accessibilityLabel="Adicionar livro" icon="add" />);
  expect(screen.getByRole('button', { name: /^Adicionar livro$/ })).toBeTruthy();
});
