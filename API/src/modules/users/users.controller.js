import { usersService } from './users.service.js';
import { assertSettingsOwner, settingsCorrelation } from '../auth/auth.actor.js';
import { authRepository } from '../auth/auth.repository.js';

export async function getMe(req, res) {
  const user = await usersService.getMe(req.currentUser.id);
  return res.status(200).json({ data: user });
}

export async function updateMe(req, res) {
  assertSettingsOwner(req);
  const correlation = settingsCorrelation(req);
  if (correlation) await authRepository.checkCorrelation(req.currentUser.id, req.identity?.sessionId, correlation);
  const user = await usersService.updateMe(req.currentUser.id, req.body);
  return res.status(200).json({ data: user });
}

export async function skipProfileOnboarding(req, res) {
  const user = await usersService.skipProfileOnboarding(req.currentUser.id);
  return res.status(200).json({ data: user });
}

export async function completeBooksOnboarding(req, res) {
  const user = await usersService.completeBooksOnboarding(req.currentUser.id);
  return res.status(200).json({ data: user });
}
