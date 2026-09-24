import { describe, expect, it } from 'vitest';
import {
  getBarcodeScanDecision,
  shouldRefreshCameraPermission,
  shouldRequestCameraPermission
} from '../scannerFlow';

describe('shouldRequestCameraPermission', () => {
  it('requests permission on the first visible opening when status is undetermined', () => {
    expect(shouldRequestCameraPermission({
      visible: true,
      permissionStatus: 'undetermined',
      requestedForOpen: false
    })).toBe(true);
  });

  it('waits while the permission hook is loading and does not request twice per opening', () => {
    expect(shouldRequestCameraPermission({
      visible: true,
      permissionStatus: null,
      requestedForOpen: false
    })).toBe(false);
    expect(shouldRequestCameraPermission({
      visible: true,
      permissionStatus: 'undetermined',
      requestedForOpen: true
    })).toBe(false);
  });
});

describe('shouldRefreshCameraPermission', () => {
  it('refreshes only after returning active from settings while the modal is visible', () => {
    expect(shouldRefreshCameraPermission({
      appState: 'active',
      visible: true,
      waitingForSettings: true
    })).toBe(true);
    expect(shouldRefreshCameraPermission({
      appState: 'background',
      visible: true,
      waitingForSettings: true
    })).toBe(false);
    expect(shouldRefreshCameraPermission({
      appState: 'active',
      visible: false,
      waitingForSettings: true
    })).toBe(false);
  });
});

describe('getBarcodeScanDecision', () => {
  it('accepts one valid ISBN and rejects a duplicate callback after lock', () => {
    const payload = { type: 'ean13', data: '9788545702870' };

    expect(getBarcodeScanDecision({ payload, locked: false, lastData: null }))
      .toEqual({ kind: 'accepted', data: payload.data, isbn: '9788545702870' });
    expect(getBarcodeScanDecision({ payload, locked: true, lastData: payload.data }))
      .toEqual({ kind: 'duplicate' });
  });

  it('reports an invalid barcode once and ignores its repeated callback', () => {
    const payload = { type: 'ean13', data: '7891234567895' };

    expect(getBarcodeScanDecision({ payload, locked: false, lastData: null }))
      .toEqual({ kind: 'invalid', data: payload.data });
    expect(getBarcodeScanDecision({ payload, locked: false, lastData: payload.data }))
      .toEqual({ kind: 'duplicate' });
  });
});
