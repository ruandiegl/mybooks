import { settingsRepository } from './settings.repository.js';
import { updatePreferencesSchema } from './settings.schemas.js';
function dto(userId, value) {
  return { schemaVersion: 1, userId, notifications: { showLikesBadge: value?.showLikesBadge ?? true }, capabilities: { changePassword: false, logoutAll: false, push: false } };
}
export function createSettingsService({ repository = settingsRepository } = {}) {
  return {
    async getPreferences(userId) { return dto(userId, await repository.find(userId)); },
    async updatePreferences(userId, input) { return dto(userId, await repository.upsert(userId, updatePreferencesSchema.parse(input))); }
  };
}
export const settingsService = createSettingsService();
