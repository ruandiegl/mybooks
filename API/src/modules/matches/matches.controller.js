import { matchesService } from './matches.service.js';

export async function createInteraction(req, res) {
  const result = await matchesService.interact(req.currentUser.id, req.body);
  return res.status(200).json({ data: result });
}

export async function listMatches(req, res) {
  const result = await matchesService.list(req.currentUser.id);
  return res.status(200).json({ data: result });
}
