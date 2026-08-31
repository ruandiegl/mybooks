import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { health, readiness } from './health.controller.js';

export const healthRouter = Router();

healthRouter.get('/', asyncHandler(health));
healthRouter.get('/ready', asyncHandler(readiness));
