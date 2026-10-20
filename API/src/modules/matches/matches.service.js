import { matchesRepository } from './matches.repository.js';
import { interactionSchema, matchIdSchema } from './matches.schemas.js';

function serializeMatch(match, currentUserId) {
  if (!match) return null;
  const otherUser = match.userAId === currentUserId ? match.userB : match.userA;
  return {
    id: match.id,
    status: match.status,
    otherUser,
    conversationId: match.conversation?.id ?? null,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt
  };
}

export const matchesService = {
  async interact(actorId, input) {
    const data = interactionSchema.parse(input);
    const { interaction, match } = await matchesRepository.applyInteraction({ actorId, ...data });

    return {
      interaction: {
        id: interaction.id,
        action: interaction.action,
        targetBookId: interaction.targetBookId,
        createdAt: interaction.createdAt
      },
      match: serializeMatch(match, actorId)
    };
  },

  async remove(actorId, matchId) {
    matchIdSchema.parse(matchId);
    return matchesRepository.remove(actorId, matchId);
  },

  async list(userId) {
    const matches = await matchesRepository.listForUser(userId);
    return matches.map((match) => serializeMatch(match, userId));
  }
};
