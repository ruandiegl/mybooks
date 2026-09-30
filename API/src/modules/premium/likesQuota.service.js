import { AppError } from '../../shared/errors/AppError.js';
import { FREE_DAILY_LIKE_LIMIT, premiumService } from './premium.service.js';
import { likesQuotaRepository } from './likesQuota.repository.js';

export function getSaoPauloQuotaDate(now) {
  const values = new Map(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now).map(({ type, value }) => [type, value])
  );
  return new Date(Date.UTC(Number(values.get('year')), Number(values.get('month')) - 1, Number(values.get('day'))));
}

export function createLikesQuotaService({
  repository = likesQuotaRepository,
  premium = premiumService,
  clock = { now: () => new Date() },
  limit = FREE_DAILY_LIKE_LIMIT
} = {}) {
  return {
    async consumeDailyLike(userId, targetBookId, persistInteraction) {
      if (typeof persistInteraction !== 'function') {
        throw new TypeError('persistInteraction callback is required to keep quota and interaction atomic.');
      }

      return repository.withUserTransaction(userId, async (tx) => {
        const now = clock.now();
        const quotaDate = getSaoPauloQuotaDate(now);
        const premiumActive = await premium.hasActiveTrial(userId, now, tx);
        await repository.deleteOlderUsage(tx, userId, quotaDate);
        const existingUsage = await repository.findUsage(tx, userId, targetBookId, quotaDate);

        if (!existingUsage) {
          const usedToday = await repository.countUsage(tx, userId, quotaDate);
          if (!premiumActive && usedToday >= limit) {
            throw new AppError('Você atingiu o limite diário de curtidas do plano gratuito.', {
              statusCode: 403,
              code: 'DAILY_LIKE_LIMIT_REACHED'
            });
          }
          await repository.createUsage(tx, { userId, targetBookId, quotaDate });
        }

        return persistInteraction(tx);
      });
    }
  };
}

export const likesQuotaService = createLikesQuotaService();
