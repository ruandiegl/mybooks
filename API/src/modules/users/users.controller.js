import { usersService } from './users.service.js';

export async function getMe(req, res) {
  const user = await usersService.getMe(req.currentUser.id);
  return res.status(200).json({ data: user });
}

export async function updateMe(req, res) {
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
