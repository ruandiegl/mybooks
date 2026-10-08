import { AppError } from '../../shared/errors/AppError.js';
export const settingsSessionChanged = () => new AppError('A sessão mudou. Abra as configurações novamente.', { statusCode: 409, code: 'SETTINGS_SESSION_CHANGED' });
export function assertSettingsOwner(req) {
  const owner = req.get('X-Settings-Owner');
  if (owner !== undefined && owner !== req.currentUser?.id) throw settingsSessionChanged();
}

export function settingsCorrelation(req, refreshTokenHash) {
  const ownerId = req.get('X-Settings-Owner'), anchorSessionId = req.get('X-Settings-Session');
  if (ownerId === undefined && anchorSessionId === undefined) return undefined;
  if (typeof ownerId !== 'string' || typeof anchorSessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(anchorSessionId)) throw settingsSessionChanged();
  if (req.currentUser && req.currentUser.id !== ownerId) throw settingsSessionChanged();
  return { ownerId, anchorSessionId, ...(refreshTokenHash ? { cookieHash: refreshTokenHash } : {}) };
}
