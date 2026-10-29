import { matchesService } from './matches.service.js';

export async function createInteraction(req, res) {
  const result = await matchesService.interact(req.currentUser.id, req.body);
  return res.status(200).json({ data: result });
}

export async function listMatches(req, res) {
  const result = await matchesService.list(req.currentUser.id);
  return res.status(200).json({ data: result });
}

export async function removeMatch(req, res) {
  const { matchId, conversationId, participantIds } = await matchesService.remove(req.currentUser.id, req.params.matchId);
  const io = req.app.get('io');
  if (io) {
    io.to(participantIds.map((id) => 'user:' + id)).emit('match:removed', { matchId, conversationId });
    if (conversationId) io.in('conversation:' + conversationId).socketsLeave('conversation:' + conversationId);
  }
  return res.status(204).end();
}
