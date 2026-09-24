import { extractIsbnFromBarcode, type BarcodePayload } from './barcode';

type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined' | null;

type PermissionRequestDecision = {
  visible: boolean;
  permissionStatus: CameraPermissionStatus;
  requestedForOpen: boolean;
};

type PermissionRefreshDecision = {
  appState: string;
  visible: boolean;
  waitingForSettings: boolean;
};

type BarcodeScanInput = {
  payload: BarcodePayload;
  locked: boolean;
  lastData: string | null;
};

export type BarcodeScanDecision =
  | { kind: 'duplicate' }
  | { kind: 'invalid'; data: string }
  | { kind: 'accepted'; data: string; isbn: string };

export function shouldRequestCameraPermission({
  visible,
  permissionStatus,
  requestedForOpen
}: PermissionRequestDecision) {
  return visible && permissionStatus === 'undetermined' && !requestedForOpen;
}

export function shouldRefreshCameraPermission({
  appState,
  visible,
  waitingForSettings
}: PermissionRefreshDecision) {
  return appState === 'active' && visible && waitingForSettings;
}

export function getBarcodeScanDecision({
  payload,
  locked,
  lastData
}: BarcodeScanInput): BarcodeScanDecision {
  if (locked || lastData === payload.data) return { kind: 'duplicate' };

  const isbn = extractIsbnFromBarcode(payload);
  return isbn
    ? { kind: 'accepted', data: payload.data, isbn }
    : { kind: 'invalid', data: payload.data };
}
