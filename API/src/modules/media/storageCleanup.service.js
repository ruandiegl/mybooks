import { env } from '../../config/env.js';
import { storageCleanupRepository } from './storageCleanup.repository.js';
import { storageService } from './storage.service.js';

const maxJobsPerRun = 20;

export const storageCleanupService = {
  async process(storageKey) {
    if (!storageKey || env.STORAGE_MODE !== 'r2') return false;

    try {
      await storageService.delete(storageKey);
      await storageCleanupRepository.delete(storageKey);
      return true;
    } catch (error) {
      try {
        await storageCleanupRepository.recordFailure(storageKey, error?.Code ?? error?.code);
      } catch {
        // A intenção de limpeza já foi gravada na transação que removeu a referência.
      }
      return false;
    }
  },

  async processDue() {
    if (env.STORAGE_MODE !== 'r2') return 0;
    const jobs = await storageCleanupRepository.listDue(new Date(), maxJobsPerRun);
    for (const job of jobs) await this.process(job.storageKey);
    return jobs.length;
  }
};
