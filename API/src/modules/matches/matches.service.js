import { serializeAvatarUser } from '../media/avatar.serializer.js';
import { likesQuotaService } from '../premium/likesQuota.service.js';
import { matchesRepository } from './matches.repository.js';
import { interactionSchema, matchIdSchema } from './matches.schemas.js';

async function serializeMatch(match, currentUserId, avatarCache = new Map()) {
  if (!match) return null;
  const otherUser = match.userAId === currentUserId ? match.userB : match.userA;
  return {
    id: match.id,
    status: match.status,
    otherUser: await serializeAvatarUser(otherUser, avatarCache),
    conversationId: match.conversation?.id ?? null,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt
  };
}

export function createMatchesService({ matches = matchesRepository, quota = likesQuotaService } = {}) {
  return {
    async interact(actorId, input) {
      const data = interactionSchema.parse(input);
      const { interaction, match } = await matches.applyInteraction(
        { actorId, ...data },
        data.action === 'LIKE'
          ? (tx) => quota.consumeDailyLike(actorId, data.targetBookId, () => undefined, tx)
          : null
      );

      return {
        interaction: {
          id: interaction.id,
          action: interaction.action,
          targetBookId: interaction.targetBookId,
          createdAt: interaction.createdAt
        },
        match: await serializeMatch(match, actorId)
      };
    },

    async remove(actorId, matchId) {
      matchIdSchema.parse(matchId);
      return matches.remove(actorId, matchId);
    },

    async list(userId) {
      const items = await matches.listForUser(userId);
      const cache = new Map();
      return Promise.all(items.map((match) => serializeMatch(match, userId, cache)));
    }
  };
}

export const matchesService = createMatchesService();
