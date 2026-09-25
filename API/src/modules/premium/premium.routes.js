import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { createPremiumController } from './premium.controller.js';

export function createPremiumRouter({ service } = {}) {
  const router = Router();
  const controller = createPremiumController({ service });

  router.get('/status', asyncHandler(controller.getStatus));
  router.post('/offer/prompted', asyncHandler(controller.markOfferPrompted));
  router.post('/trial/activate', asyncHandler(controller.activateTrial));

  return router;
}

export const premiumRouter = createPremiumRouter();
