import { avatarService } from './avatar.service.js';

export async function presignAvatar(req, res) {
  return res.status(201).json({ data: await avatarService.presign(req.currentUser.id, req.body) });
}

export async function completeAvatar(req, res) {
  return res.status(200).json({ data: await avatarService.complete(req.currentUser.id, req.body) });
}

export async function deleteAvatar(req, res) {
  const avatar = await avatarService.delete(req.currentUser.id);
  if (req.get('Prefer')?.split(',').map((value) => value.trim()).includes('return=representation')) {
    return res.set('Preference-Applied', 'return=representation').status(200).json({ data: avatar });
  }
  return res.status(204).send();
}
