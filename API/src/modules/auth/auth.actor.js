import { AppError } from '../../shared/errors/AppError.js';
export const settingsSessionChanged = () => new AppError('A sessão mudou. Abra as configurações novamente.', { statusCode: 409, code: 'SETTINGS_SESSION_CHANGED' });
export function assertSettingsOwner(req) {
  const owner = req.get('X-Settings-Owner');
  if (owner !== undefined && owner !== req.currentUser?.id) throw settingsSessionChanged();
}
