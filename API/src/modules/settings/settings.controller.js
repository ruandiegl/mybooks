import { assertSettingsOwner } from '../auth/auth.actor.js';
import { settingsService } from './settings.service.js';
export function createSettingsController(service = settingsService) {
  return {
    async get(req, res) { assertSettingsOwner(req); res.set('Cache-Control', 'private, no-store'); return res.json({ data: await service.getPreferences(req.currentUser.id) }); },
    async update(req, res) { assertSettingsOwner(req); res.set('Cache-Control', 'private, no-store'); return res.json({ data: await service.updatePreferences(req.currentUser.id, req.body) }); }
  };
}
