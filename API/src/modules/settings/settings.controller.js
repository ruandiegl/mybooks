import { assertSettingsOwner, settingsCorrelation } from '../auth/auth.actor.js';
import { authRepository } from '../auth/auth.repository.js';
import { settingsService } from './settings.service.js';
export function createSettingsController(service = settingsService) {
  const guard = async req => {
    assertSettingsOwner(req);
    const correlation = settingsCorrelation(req);
    if (correlation) await authRepository.checkCorrelation(req.currentUser.id, req.identity?.sessionId, correlation);
  };
  return {
    async get(req, res) { await guard(req); res.set('Cache-Control', 'private, no-store'); return res.json({ data: await service.getPreferences(req.currentUser.id) }); },
    async update(req, res) { await guard(req); res.set('Cache-Control', 'private, no-store'); return res.json({ data: await service.updatePreferences(req.currentUser.id, req.body) }); }
  };
}
