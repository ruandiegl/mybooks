// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => ({ ...(await import('react-native-web')), useWindowDimensions: () => ({ width: 375, height: 812, fontScale: 1, scale: 1 }) }));
vi.mock('react-native-safe-area-context', async () => ({ SafeAreaView: (await import('react-native-web')).View, useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('../../../components/AvatarEditor', () => ({ AvatarEditor: (props: any) => { const [initialSource] = React.useState(props.source.uri); return <><span>{initialSource}</span><button onClick={() => props.onSave({ originX: 0, originY: 0, width: 512, height: 512 })}>Salvar recorte</button><button onClick={props.onCancel}>Cancelar recorte</button></>; } }));
import { AvatarPhotoModal } from '../../../components/AvatarPhotoModal';
import type { AvatarPhotoModalProps } from '../../../components/AvatarPhotoModal/AvatarPhotoModal.types';
function props(overrides: Partial<AvatarPhotoModalProps> = {}): AvatarPhotoModalProps {
  return { visible: true, name: 'Leitora', avatar: { avatarUrl: 'https://signed.test/photo.jpg', avatarVersion: 1, avatarUrlExpiresAt: null }, busy: false, onClose: () => {}, onEdit: () => {}, onTakePhoto: () => {}, onRemove: () => {}, onCancelCrop: () => {}, onSave: () => {}, ...overrides };
}
afterEach(cleanup);
describe('expanded profile photo', () => {
  it('does not dismiss when the photo border itself is tapped', async () => {
    const events: string[] = [];
    render(<AvatarPhotoModal {...props({ onClose: () => events.push('close') })} />);
    let surface = await screen.findByRole('img', { name: 'Foto de perfil de Leitora' });
    while (!parseFloat(getComputedStyle(surface).borderTopWidth)) surface = surface.parentElement!;
    fireEvent.click(surface);
    expect(events).toEqual([]);
  });
  it('keeps the photo viewer open while suppressing the browser image menu', async () => {
    const events: string[] = [];
    render(<AvatarPhotoModal {...props({ onClose: () => events.push('close') })} />);
    const photo = await screen.findByRole('img', { name: 'Foto de perfil de Leitora' });
    const image = photo.querySelector('img')!;
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    expect(fireEvent(image, menu)).toBe(false);
    expect(events).toEqual([]);
    expect(screen.getByRole('button', { name: 'Editar foto' })).toBeTruthy();
  });
  it('starts keyboard focus on the close control instead of the backdrop', async () => {
    render(<AvatarPhotoModal {...props()} />);
    const close = await screen.findByRole('button', { name: 'Fechar foto de perfil' });
    expect(document.activeElement).toBe(close);
  });
  it('has a name and excludes non-controls from keyboard stops', async () => {
    render(<AvatarPhotoModal {...props()} />);
    const dialog = await screen.findByRole('dialog', { name: 'Foto de perfil' });
    const stops = Array.from(dialog.querySelectorAll('[tabindex="0"]')).map(element => element.getAttribute('aria-label'));
    expect(stops).toEqual(['Fechar foto de perfil', 'Editar foto', 'Tirar foto', 'Remover foto']);
  });
  it('resets crop-local state when a different source image is chosen', async () => {
    const first = props({ source: { uri: 'first-source', width: 512, height: 512, ownedResource: true } });
    const mounted = render(<AvatarPhotoModal {...first} />);
    await screen.findByText('first-source');
    mounted.rerender(<AvatarPhotoModal {...first} source={{ uri: 'second-source', width: 512, height: 512, ownedResource: true }} />);
    expect(await screen.findByText('second-source')).toBeTruthy();
    expect(screen.queryByText('first-source')).toBeNull();
  });
  it('shows only editing, camera and removal actions without sharing', async () => {
    render(<AvatarPhotoModal {...props()} />);
    expect(await screen.findByRole('button', { name: 'Editar foto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeTruthy();
    expect(screen.queryByText(/compartilhar|copiar link|QR code|adicionar avatar/i)).toBeNull();
  });
  it('dispatches distinct actions without choosing a file on open', async () => {
    const events: string[] = [];
    render(<AvatarPhotoModal {...props({ onEdit: () => events.push('edit'), onTakePhoto: () => events.push('camera'), onRemove: () => events.push('remove') })} />);
    await screen.findByRole('button', { name: 'Editar foto' }); expect(events).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Editar foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    expect(events).toEqual(['edit', 'camera', 'remove']);
  });
  it('closes with the close control and Escape without changing the photo', async () => {
    const events: string[] = [];
    render(<AvatarPhotoModal {...props({ onClose: () => events.push('close'), onRemove: () => events.push('remove') })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fechar foto de perfil' }));
    fireEvent.keyUp(document, { key: 'Escape' });
    expect(events).toEqual(['close', 'close']);
  });
  it('blocks photo mutations and closing while an operation is busy', async () => {
    const events: string[] = [];
    render(<AvatarPhotoModal {...props({ busy: true, onEdit: () => events.push('edit'), onTakePhoto: () => events.push('camera'), onRemove: () => events.push('remove'), onClose: () => events.push('close') })} />);
    await screen.findByRole('button', { name: 'Editar foto' });
    for (const name of ['Editar foto', 'Tirar foto', 'Remover foto', 'Fechar foto de perfil']) fireEvent.click(screen.getByRole('button', { name }));
    fireEvent.keyUp(document, { key: 'Escape' });
    expect(events).toEqual([]);
  });
  it('does not allow removing an absent avatar', async () => {
    const events: string[] = [];
    render(<AvatarPhotoModal {...props({ avatar: { avatarUrl: null, avatarVersion: 0, avatarUrlExpiresAt: null }, onRemove: () => events.push('remove') })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remover foto' }));
    expect(events).toEqual([]);
  });
  it('keeps crop in the same modal and sends cancellation back to the current photo', async () => {
    const events: unknown[] = [];
    render(<AvatarPhotoModal {...props({ source: { uri: 'prepared:camera', width: 512, height: 512, ownedResource: true }, onSave: rect => events.push(rect), onCancelCrop: () => events.push('cancel') })} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar recorte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar recorte' }));
    expect(screen.queryByRole('button', { name: 'Tirar foto' })).toBeNull();
    expect(events).toEqual([{ originX: 0, originY: 0, width: 512, height: 512 }, 'cancel']);
  });
  it('does not render a closed viewer', () => {
    render(<AvatarPhotoModal {...props({ visible: false })} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('dismisses the empty portrait area but not the photo itself', async () => {
    const events: string[] = [];
    render(<AvatarPhotoModal {...props({ onClose: () => events.push('close') })} />);
    const photo = await screen.findByRole('img', { name: 'Foto de perfil de Leitora' });
    fireEvent.click(photo); expect(events).toEqual([]);
    fireEvent.click(photo.parentElement!); expect(events).toEqual(['close']);
  });
});
