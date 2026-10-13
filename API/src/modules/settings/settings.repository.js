import { prisma } from '../../shared/database/prisma.js';
export function createSettingsRepository(client = prisma) {
  return {
    find: userId => client.userPreferences.findUnique({ where: { userId }, select: { showLikesBadge: true } }),
    upsert: (userId, input) => client.userPreferences.upsert({ where: { userId }, create: { userId, ...input }, update: input, select: { showLikesBadge: true } })
  };
}
export const settingsRepository = createSettingsRepository();
