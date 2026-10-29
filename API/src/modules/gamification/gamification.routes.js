import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { checkIn, getLeaderboard } from './gamification.controller.js';

export const gamificationRouter = Router();

gamificationRouter.post('/check-in', asyncHandler(checkIn));
gamificationRouter.get('/leaderboard', asyncHandler(getLeaderboard));
