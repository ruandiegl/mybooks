import { avatarService } from './avatar.service.js';

export async function presignAvatar(req, res) {
  return res.status(201).json({ data: await avatarService.presign(req.currentUser.id, req.body) });
}

export async function completeAvatar(req, res) {
  return res.status(200).json({ data: await avatarService.complete(req.currentUser.id, req.body) });
}

export async function deleteAvatar(req, res) {
  await avatarService.delete(req.currentUser.id);
  return res.status(204).send();
}
