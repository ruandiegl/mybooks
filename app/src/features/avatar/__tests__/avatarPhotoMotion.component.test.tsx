// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const device = vi.hoisted(() => ({ reduced: false, fontScale: 1, labelLayout: undefined as ((event: any) => void) | undefined, delayedShow: false, onShow: undefined as (() => void) | undefined, listener: undefined as ((value: boolean) => void) | undefined }));
vi.mock('react-native', async () => {
  const native = await vi.importActual<typeof import('react-native')>('react-native-web');
  // RN Web deliberately exports AnimatedMock in NODE_ENV=test; exercise its real frame engine.
  // Match the CommonJS graph used by RN Web so its views recognize these AnimatedNode instances.
  const implementation = await vi.importActual<{ default: typeof native.Animated }>('react-native-web/dist/cjs/vendor/react-native/Animated/AnimatedImplementation');
  return {
  ...native,
  Animated: { ...native.Animated, ...implementation.default },
  Text: (props: any) => { if (props.children === 'Remover foto') device.labelLayout = props.onLayout; return React.createElement(native.Text, props); },
  Modal: (props: any) => React.createElement(native.Modal, { ...props, onShow: device.delayedShow ? () => { device.onShow = props.onShow; } : props.onShow }),
  useWindowDimensions: () => ({ width: 375, height: 812, fontScale: device.fontScale, scale: 1 }),
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => device.reduced,
    addEventListener: (_event: string, listener: (value: boolean) => void) => {
      device.listener = listener;
      return { remove: () => { device.listener = undefined; } };
    }
  }
}; });
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View, useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
import { AvatarPhotoModal } from '../../../components/AvatarPhotoModal';
import type { AvatarPhotoModalProps } from '../../../components/AvatarPhotoModal/AvatarPhotoModal.types';

function props(overrides: Partial<AvatarPhotoModalProps> = {}): AvatarPhotoModalProps {
  return { visible: true, name: 'Leitora', avatar: { avatarUrl: 'https://signed.test/photo.jpg', avatarVersion: 1, avatarUrlExpiresAt: null }, busy: false, onClose: () => {}, onEdit: () => {}, onTakePhoto: () => {}, onRemove: () => {}, onCancelCrop: () => {}, onSave: () => {}, ...overrides };
}
async function show(value = props()) {
  const mounted = render(<AvatarPhotoModal {...value} visible={false} />);
  await act(async () => {}); // Native motion preference resolves before the user opens the viewer.
  await act(async () => mounted.rerender(<AvatarPhotoModal {...value} />));
  return { mounted, value };
}
function scale() {
  const photo = screen.getByRole('img', { name: 'Foto de perfil de Leitora' });
  return Number(photo.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? 1);
}
function fades() {
  const photo = screen.getByRole('img', { name: 'Foto de perfil de Leitora' });
  const actions = screen.getByRole('button', { name: 'Editar foto' }).parentElement!;
  const scrim = Array.from(screen.getByRole('dialog').querySelectorAll('div')).find(element => getComputedStyle(element).position === 'absolute' && getComputedStyle(element).backgroundColor === 'rgb(39, 23, 25)')!;
  return [photo, actions, scrim].map(element => Number(getComputedStyle(element).opacity));
}
async function frames(milliseconds: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
}
beforeEach(() => {
  device.reduced = false;
  device.fontScale = 1;
  device.labelLayout = undefined;
  device.delayedShow = false;
  device.onShow = undefined;
  device.listener = undefined;
  vi.useFakeTimers();
  // Only the browser's frame clock is emulated; Animated and the modal are real RN Web.
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('profile photo motion', () => {
  it('keeps measured overflow stacked until closing, then restores the normal row', async () => {
    const { mounted, value } = await show();
    const direction = () => getComputedStyle(screen.getByRole('button', { name: 'Editar foto' }).parentElement!).flexDirection;
    expect(direction()).toBe('row');
    act(() => device.labelLayout?.({ nativeEvent: { layout: { x: 0, y: 0, width: 180, height: 63 } } }));
    expect(direction()).toBe('column');
    act(() => device.labelLayout?.({ nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 21 } } }));
    expect(direction()).toBe('column');
    mounted.rerender(<AvatarPhotoModal {...value} visible={false} />);
    mounted.rerender(<AvatarPhotoModal {...value} />);
    expect(direction()).toBe('row');
  });
  it('reflows the three choices into a readable list with large system text', async () => {
    device.fontScale = 3;
    await show();
    const edit = screen.getByRole('button', { name: 'Editar foto' });
    expect(getComputedStyle(edit.parentElement!).flexDirection).toBe('column');
    expect(getComputedStyle(edit).flexDirection).toBe('row');
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeTruthy();
  });
  it('prepares the entrance before a delayed native onShow without flashing the full photo', async () => {
    device.delayedShow = true;
    await show();
    expect(scale()).toBeCloseTo(0.82);
    expect(fades()).toEqual([0, 0, 0]);
    await frames(100);
    expect(scale()).toBeCloseTo(0.82);
    act(() => device.onShow?.());
    await frames(96);
    expect(scale()).toBeGreaterThan(0.82);
    await frames(224);
    expect(scale()).toBeCloseTo(1);
  });
  it('fades the photo, scrim and actions together and reaches a legible final state', async () => {
    await show();
    expect(fades()).toEqual([0, 0, 0]);
    await frames(80);
    for (const opacity of fades()) expect(opacity).toBeGreaterThan(0);
    await frames(240);
    expect(fades()).toEqual([1, 1, 0.94]);
  });
  it('cancels dismissal when the viewer switches into the crop editor', async () => {
    const events: string[] = [];
    const { mounted, value } = await show(props({ onClose: () => events.push('close') }));
    await frames(320);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    await frames(32);
    mounted.rerender(<AvatarPhotoModal {...value} source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1fcAAAAASUVORK5CYII=', width: 512, height: 512, ownedResource: true }} />);
    await frames(320);
    expect(events).toEqual([]);
    expect(screen.getByRole('button', { name: 'Cancelar ajuste' })).toBeTruthy();
    mounted.rerender(<AvatarPhotoModal {...value} />);
    expect(scale()).toBe(1);
  });
  it('cancels dismissal when an operation becomes busy and remains visible afterward', async () => {
    const events: string[] = [];
    const { mounted, value } = await show(props({ onClose: () => events.push('close') }));
    await frames(320);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    await frames(32);
    mounted.rerender(<AvatarPhotoModal {...value} busy />);
    await frames(320);
    expect(events).toEqual([]);
    mounted.rerender(<AvatarPhotoModal {...value} />);
    expect(scale()).toBe(1);
  });
  it('expands the photo to its final size without moving the surrounding controls', async () => {
    await show();
    const initial = scale();
    expect(initial).toBeLessThan(1);
    expect(initial).toBeGreaterThan(0.5);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    await frames(96);
    expect(scale()).toBeGreaterThan(initial);
    await frames(224);
    expect(scale()).toBeCloseTo(1);
    expect(screen.getByRole('button', { name: 'Editar foto' })).toBeTruthy();
  });
  it('shrinks before dismissing and completes repeated close requests only once', async () => {
    const events: string[] = [];
    await show(props({ onClose: () => events.push('close') }));
    await frames(320);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    fireEvent.keyUp(document, { key: 'Escape' });
    expect(events).toEqual([]);
    await frames(80);
    expect(scale()).toBeLessThan(1);
    expect(events).toEqual([]);
    await frames(144);
    expect(events).toEqual(['close']);
  });
  it('can close while the entrance is still running', async () => {
    const events: string[] = [];
    await show(props({ onClose: () => events.push('close') }));
    await frames(48);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    expect(events).toEqual([]);
    await frames(240);
    expect(events).toEqual(['close']);
  });
  it('shows and dismisses immediately when reduced motion is enabled', async () => {
    device.reduced = true;
    const events: string[] = [];
    await show(props({ onClose: () => events.push('close') }));
    expect(scale()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    expect(events).toEqual(['close']);
  });
  it('finishes an interrupted dismissal when the motion preference changes', async () => {
    const events: string[] = [];
    await show(props({ onClose: () => events.push('close') }));
    await frames(320);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    await frames(32);
    act(() => device.listener?.(true));
    expect(events).toEqual(['close']);
    await frames(320);
    expect(events).toEqual(['close']);
  });
  it('cancels a stale dismissal when the owner hides and reopens the modal', async () => {
    const events: string[] = [];
    const { mounted, value } = await show(props({ onClose: () => events.push('close') }));
    await frames(320);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    await frames(32);
    mounted.rerender(<AvatarPhotoModal {...value} visible={false} />);
    mounted.rerender(<AvatarPhotoModal {...value} />);
    await frames(400);
    expect(events).toEqual([]);
    expect(scale()).toBeCloseTo(1);
  });
  it('does not send a delayed close after unmounting', async () => {
    const events: string[] = [];
    const { mounted } = await show(props({ onClose: () => events.push('close') }));
    await frames(320);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar foto de perfil' }));
    mounted.unmount();
    await frames(320);
    expect(events).toEqual([]);
  });
});
