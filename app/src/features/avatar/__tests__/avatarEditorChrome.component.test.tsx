// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const device = vi.hoisted(() => ({ fontScale: 1, titleLayout: undefined as undefined | ((event: any) => void) }));
vi.mock('react-native', async () => {
  const native = await import('react-native-web');
  return { ...native, Text: (props: any) => { if (props.accessibilityRole === 'header') device.titleLayout = props.onLayout; return React.createElement(native.Text, props); }, useWindowDimensions: () => ({ width: 375, height: 812, fontScale: device.fontScale, scale: 1 }) };
});
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
import { AvatarEditorControls } from '../../../components/AvatarEditor/AvatarEditorControls';
const defaults = { busy: false, ready: true, lowResolution: false, onSave: () => {}, onCancel: () => {} };
afterEach(() => { cleanup(); device.fontScale = 1; });
describe('gesture-first avatar editor chrome', () => {
  it('adapts when browser text enlargement wraps the title without changing fontScale', () => {
    render(<AvatarEditorControls {...defaults} />);
    act(() => device.titleLayout?.({ nativeEvent: { layout: { height: 100, width: 80, x: 0, y: 0 } } }));
    const heading = screen.getByRole('heading', { name: 'Ajustar foto' });
    expect(heading.parentElement!.firstElementChild).toBe(heading);
  });
  it('stacks the title and allows action labels to wrap at large system text sizes', () => {
    device.fontScale = 3;
    render(<AvatarEditorControls {...defaults} />);
    const heading = screen.getByRole('heading', { name: 'Ajustar foto' });
    expect(heading.parentElement!.firstElementChild).toBe(heading);
    for (const name of ['Cancelar ajuste', 'Salvar foto']) {
      const button = screen.getByRole('button', { name });
      expect(getComputedStyle(button).minWidth).toBe('0px');
      expect(getComputedStyle(button.querySelector('div')!).flexShrink).toBe('1');
    }
  });
  it('offers only cancel and save in the header', () => {
    render(<AvatarEditorControls {...defaults}><div>Foto</div></AvatarEditorControls>);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    const header = screen.getByRole('heading', { name: 'Ajustar foto' }).parentElement!;
    expect(header.contains(screen.getByRole('button', { name: 'Cancelar ajuste' }))).toBe(true);
    expect(header.contains(screen.getByRole('button', { name: 'Salvar foto' }))).toBe(true);
    expect(screen.queryByText(/botões abaixo|100%/i)).toBeNull();
  });
  it('keeps cancellation available before the image loads but blocks premature saving', () => {
    const events: string[] = [];
    render(<AvatarEditorControls {...defaults} ready={false} onSave={() => events.push('save')} onCancel={() => events.push('cancel')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar ajuste' }));
    expect(events).toEqual(['cancel']);
  });
  it('blocks both header actions while saving and retains error/retry feedback', () => {
    const events: string[] = [];
    const mounted = render(<AvatarEditorControls {...defaults} busy statusLabel="Enviando foto…" onSave={() => events.push('save')} onCancel={() => events.push('cancel')} />);
    for (const button of screen.getAllByRole('button')) fireEvent.click(button);
    expect(events).toEqual([]);
    expect(screen.getAllByText('Enviando foto…').length).toBeGreaterThan(0);
    mounted.rerender(<AvatarEditorControls {...defaults} error="Tente novamente." onSave={() => events.push('retry')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(events).toEqual(['retry']);
  });
});
