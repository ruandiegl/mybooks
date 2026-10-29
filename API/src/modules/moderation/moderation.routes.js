import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { AppError } from '../../shared/errors/AppError.js';
import { moderationService } from './moderation.service.js';
import { prisma } from '../../shared/database/prisma.js';

export const moderationRouter = Router();
moderationRouter.use(['/me/blocks', '/users/:userId/public', '/users/:userId/reports', '/users/:userId/block'], (_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
const limit = rateLimit({
  windowMs: 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: req => req.currentUser?.id ?? ipKeyGenerator(req.ip ?? ''),
  handler: (_req, _res, next) => next(new AppError('Tente novamente em instantes.', { statusCode: 429, code: 'RATE_LIMITED' }))
});

moderationRouter.get('/me/blocks', asyncHandler(async (req, res) => res.json({ data: await moderationService.listBlocks(req.currentUser.id) })));
moderationRouter.get('/users/:userId/public', asyncHandler(async (req, res) => res.json({ data: await moderationService.publicProfile(req.currentUser.id, req.params.userId) })));
moderationRouter.post('/users/:userId/reports', limit, asyncHandler(async (req, res) => res.status(201).json({ data: await moderationService.report(req.currentUser.id, req.params.userId, req.body) })));
async function changeBlock(req, res, block) {
  const actorId = req.currentUser.id;
  const targetId = req.params.userId;
  const data = block ? await moderationService.block(actorId, targetId) : await moderationService.unblock(actorId, targetId);
  const io = req.app.get('io');
  if (io) {
    try {
      if (block) {
        const pair = [actorId, targetId].sort();
        const match = await prisma.match.findUnique({
          where: { userAId_userBId: { userAId: pair[0], userBId: pair[1] } },
          select: { conversation: { select: { id: true } } }
        });
        if (match?.conversation?.id) io.in('conversation:' + match.conversation.id).socketsLeave('conversation:' + match.conversation.id);
      }
      io.to(['user:' + actorId, 'user:' + targetId]).emit('relationship:changed', { userId: actorId, otherUserId: targetId, blocked: block });
    } catch {
      // A committed block must not be reported as a failed HTTP write if realtime delivery fails.
    }
  }
  res.json({ data });
}
moderationRouter.put('/users/:userId/block', limit, asyncHandler((req, res) => changeBlock(req, res, true)));
moderationRouter.delete('/users/:userId/block', limit, asyncHandler((req, res) => changeBlock(req, res, false)));
