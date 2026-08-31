import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { completeImage, deleteImage, presignImage } from './media.controller.js';

export const mediaRouter = Router({ mergeParams: true });

mediaRouter.post('/presign', asyncHandler(presignImage));
mediaRouter.post('/complete', asyncHandler(completeImage));
mediaRouter.delete('/:imageId', asyncHandler(deleteImage));
