import { prisma } from '../../shared/database/prisma.js';

const premiumUserSelect = {
  id: true,
  emailVerifiedAt: true,
  isActive: true,
  premiumTrialStartedAt: true,
  premiumTrialEndsAt: true,
  premiumOfferPromptedAt: true,
  premiumOfferCohort: true
};

export const premiumRepository = {
  findById(userId, client = prisma) {
    return client.user.findUnique({
      where: { id: userId },
      select: premiumUserSelect
    });
  },

  async activateTrialIfNotStarted({ userId, startedAt, endsAt }) {
    const result = await prisma.user.updateMany({
      where: {
        id: userId,
        isActive: true,
        emailVerifiedAt: { not: null },
        premiumTrialStartedAt: null
      },
      data: {
        premiumTrialStartedAt: startedAt,
        premiumTrialEndsAt: endsAt
      }
    });
    return result.count === 1;
  },

  async markOfferPromptedIfEmpty({ userId, promptedAt }) {
    const result = await prisma.user.updateMany({
      where: { id: userId, premiumOfferPromptedAt: null },
      data: { premiumOfferPromptedAt: promptedAt }
    });
    return result.count === 1;
  }
};
