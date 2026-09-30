import { premiumService } from './premium.service.js';
import { premiumEmptyRequestSchema } from './premium.schemas.js';

export function createPremiumController({ service = premiumService } = {}) {
  return {
    getStatus: async (req, res) => res.status(200).json({
      data: await service.getPremiumStatus(req.currentUser.id)
    }),

    markOfferPrompted: async (req, res) => {
      premiumEmptyRequestSchema.parse(req.body ?? {});
      return res.status(200).json({
        data: await service.markOfferPrompted(req.currentUser.id)
      });
    },

    activateTrial: async (req, res) => {
      premiumEmptyRequestSchema.parse(req.body ?? {});
      return res.status(200).json({
        data: await service.activateTrial(req.currentUser.id)
      });
    }
  };
}
