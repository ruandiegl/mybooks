import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { createSettingsController } from './settings.controller.js';
export function createSettingsRouter({ service } = {}) {
  const router = Router(), controller = createSettingsController(service);
  router.get('/me/preferences', asyncHandler(controller.get));
  router.patch('/me/preferences', asyncHandler(controller.update));
  return router;
}
export const settingsRouter = createSettingsRouter();
