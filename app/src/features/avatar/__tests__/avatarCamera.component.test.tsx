// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const device = vi.hoisted(() => ({ os: 'ios', camera: vi.fn(), gallery: vi.fn(), permission: vi.fn(), prepare: vi.fn(), released: [] as string[], network: [] as string[] }));
vi.mock('react-native', async () => ({ ...(await import('react-native-web')), Platform: { get OS() { return device.os; } } }));
vi.mock('expo-image-picker', () => ({ launchCameraAsync: device.camera, launchImageLibraryAsync: device.gallery, requestCameraPermissionsAsync: device.permission, CameraType: { front: 'front' }, UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' } }));
vi.mock('../avatarApi', () => ({ avatarApi: { presign: async () => { device.network.push('presign'); }, complete: async () => { device.network.push('complete'); }, remove: async () => { device.network.push('remove'); } } }));
vi.mock('../prepareAvatarSource', () => ({ prepareAvatarSource: device.prepare, releaseAvatarResource: (resource: any) => device.released.push(resource.uri) }));
vi.mock('../exportAvatarCrop', () => ({ exportAvatarCrop: async () => {} }));
vi.mock('../../media/putPreparedImage', () => ({ putPreparedImage: async () => {} }));
vi.mock('../../../services/api', () => ({ apiErrorMessage: () => 'offline' }));
import { useAvatarEditor } from '../useAvatarEditor';
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient(); clients.push(client);
  const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(({ userId }) => useAvatarEditor(userId, () => {}), { wrapper, initialProps: { userId: 'first' } });
}
beforeEach(() => {
  vi.clearAllMocks(); device.os = 'ios'; device.released.length = 0; device.network.length = 0;
  device.permission.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' });
  device.camera.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///camera.jpg', width: 800, height: 600, mimeType: 'image/jpeg' }] });
  device.gallery.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///gallery.jpg', width: 800, height: 600, mimeType: 'image/jpeg' }] });
  device.prepare.mockImplementation(async asset => ({ uri: 'prepared:' + asset.uri, width: 800, height: 600, ownedResource: true }));
});
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });
const cameraAction = (hook: ReturnType<typeof mount>) => {
  expect(typeof (hook.result.current as any).takePhoto).toBe('function');
  return (hook.result.current as any).takePhoto as () => Promise<void>;
};
describe('avatar camera selection', () => {
  it('prepares a still photo for the existing crop, without uploading automatically', async () => {
    const hook = mount(); const takePhoto = cameraAction(hook);
    await act(async () => { await takePhoto(); });
    expect(hook.result.current.source?.uri).toBe('prepared:file:///camera.jpg');
    expect(hook.result.current.phase).toBe('editing');
    expect(device.camera.mock.calls[0][0]).toMatchObject({ mediaTypes: ['images'], cameraType: 'front', allowsEditing: false, exif: false, base64: false });
    expect(device.network).toEqual([]);
  });
  it('asks for camera permission only when the action is used', async () => {
    const hook = mount(); const takePhoto = cameraAction(hook);
    expect(device.permission.mock.calls).toHaveLength(0);
    await act(async () => { await takePhoto(); });
    expect(device.permission.mock.calls).toHaveLength(1);
  });
  it('preserves the current photo when permission is permanently denied', async () => {
    device.permission.mockResolvedValue({ granted: false, canAskAgain: false, status: 'denied', expires: 'never' });
    const hook = mount(); const takePhoto = cameraAction(hook);
    await act(async () => { await takePhoto(); });
    expect(hook.result.current.source).toBeUndefined();
    expect(hook.result.current.permissionBlocked).toBe(true);
    expect(hook.result.current.error).toMatch(/câmera/i);
    expect(device.camera.mock.calls).toHaveLength(0); expect(device.network).toEqual([]);
  });
  it('does not suggest settings while the native permission can be asked again', async () => {
    device.permission.mockResolvedValue({ granted: false, canAskAgain: true, status: 'denied', expires: 'never' });
    const hook = mount(); const takePhoto = cameraAction(hook);
    await act(async () => { await takePhoto(); });
    expect(hook.result.current.permissionBlocked).toBe(false);
    expect(hook.result.current.busy).toBe(false);
    expect(device.camera.mock.calls).toHaveLength(0);
  });
  it('does not open the camera after switching accounts during the permission prompt', async () => {
    let resolve!: (value: unknown) => void;
    device.permission.mockReturnValue(new Promise(r => { resolve = r; }));
    const hook = mount(); const takePhoto = cameraAction(hook); let pending!: Promise<void>;
    act(() => { pending = takePhoto(); }); hook.rerender({ userId: 'second' });
    await act(async () => { resolve({ granted: true, canAskAgain: true }); await pending; });
    expect(device.camera.mock.calls).toHaveLength(0); expect(hook.result.current.source).toBeUndefined();
  });
  it('keeps an unsaved gallery crop if the camera is cancelled', async () => {
    device.camera.mockResolvedValue({ canceled: true, assets: null });
    const hook = mount(); const takePhoto = cameraAction(hook);
    await act(async () => { await hook.result.current.choose(); });
    await act(async () => { await takePhoto(); });
    expect(hook.result.current.source?.uri).toBe('prepared:file:///gallery.jpg');
    expect(hook.result.current.phase).toBe('editing'); expect(device.network).toEqual([]);
  });
  it('opens web capture within the click call, without awaiting a permission promise', async () => {
    device.os = 'web'; device.camera.mockResolvedValue({ canceled: true, assets: null });
    const hook = mount(); const takePhoto = cameraAction(hook); let pending!: Promise<void>;
    act(() => { pending = takePhoto(); expect(device.camera.mock.calls).toHaveLength(1); });
    await act(async () => { await pending; });
    expect(device.permission.mock.calls).toHaveLength(0);
  });
  it('releases a late web camera Blob after unmount without applying it', async () => {
    device.os = 'web'; const active = new Set(['blob:camera-late']);
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: (uri: string) => active.delete(uri) });
    let resolve!: (value: unknown) => void;
    device.camera.mockReturnValue(new Promise(r => { resolve = r; }));
    const hook = mount(); const takePhoto = cameraAction(hook); let pending!: Promise<void>;
    act(() => { pending = takePhoto(); }); hook.unmount();
    await act(async () => { resolve({ canceled: false, assets: [{ uri: 'blob:camera-late' }] }); await pending; });
    expect([...active]).toEqual([]); expect(device.prepare.mock.calls).toHaveLength(0);
  });
});
