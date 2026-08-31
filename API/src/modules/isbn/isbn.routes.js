import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { lookupIsbn } from './isbn.controller.js';

export const isbnRouter = Router();

isbnRouter.get('/:isbn', asyncHandler(lookupIsbn));
