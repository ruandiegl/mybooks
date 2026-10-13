import { describe, expect, it } from 'vitest';
import { createSettingsService } from '../src/modules/settings/settings.service.js';
describe('account preferences contract', () => {
  it('reads missing preferences without writing and persists an explicit false only for its owner', async () => {
    const rows = new Map();
    const service = createSettingsService({ repository: { find: async id => rows.get(id), upsert: async (id, value) => { rows.set(id, value); return value; } } });
    expect(await service.getPreferences('ana')).toMatchObject({ schemaVersion: 1, userId: 'ana', notifications: { showLikesBadge: true }, capabilities: { push: false } });
    expect(rows.size).toBe(0);
    expect(await service.updatePreferences('ana', { showLikesBadge: false })).toMatchObject({ notifications: { showLikesBadge: false } });
    expect((await service.getPreferences('other')).notifications.showLikesBadge).toBe(true);
    expect(rows.size).toBe(1);
  });
  it.each([{ userId: 'other', showLikesBadge: false }, { showLikesBadge: 'false' }, {}, { showLikesBadge: false, push: true }])('rejects foreign fields and invalid payloads %j', async input => {
    const service = createSettingsService({ repository: {} });
    await expect(service.updatePreferences('ana', input)).rejects.toMatchObject({ name: 'ZodError' });
  });
});
