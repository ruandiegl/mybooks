import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { createInteraction, listMatches } from './matches.controller.js';

export const matchesRouter = Router();

matchesRouter.post('/interactions', asyncHandler(createInteraction));
matchesRouter.get('/matches', asyncHandler(listMatches));
