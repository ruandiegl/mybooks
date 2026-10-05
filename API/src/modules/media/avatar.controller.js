import { avatarService } from './avatar.service.js';
import { AppError } from '../../shared/errors/AppError.js';

// Assertion only: identity/ownership always comes from the authenticated session.
function assertExpectedOwner(req) {
  const expected = req.get('X-Avatar-Owner');
  if (expected !== undefined && expected !== req.currentUser.id) {
    throw new AppError('A conta mudou. Escolha a foto novamente na conta atual.', { statusCode: 409, code: 'AVATAR_SESSION_CHANGED' });
  }
}

export async function presignAvatar(req, res) {
  assertExpectedOwner(req);
  return res.status(201).json({ data: await avatarService.presign(req.currentUser.id, req.body) });
}

export async function completeAvatar(req, res) {
  assertExpectedOwner(req);
  return res.status(200).json({ data: await avatarService.complete(req.currentUser.id, req.body) });
}

export async function deleteAvatar(req, res) {
  assertExpectedOwner(req);
  const avatar = await avatarService.delete(req.currentUser.id);
  if (req.get('Prefer')?.split(',').map((value) => value.trim()).includes('return=representation')) {
    return res.set('Preference-Applied', 'return=representation').status(200).json({ data: avatar });
  }
  return res.status(204).send();
}
