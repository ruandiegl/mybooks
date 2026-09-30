import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import { completeImage, deleteImage, presignImage, reorderImages } from './media.controller.js';

export const mediaRouter = Router({ mergeParams: true });

mediaRouter.post('/presign', asyncHandler(presignImage));
mediaRouter.post('/complete', asyncHandler(completeImage));
mediaRouter.put('/order', asyncHandler(reorderImages));
mediaRouter.delete('/:imageId', asyncHandler(deleteImage));
