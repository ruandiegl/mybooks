import { mediaService } from './media.service.js';

export async function presignImage(req, res) {
  const result = await mediaService.presign(req.currentUser.id, req.params.bookId, req.body);
  return res.status(201).json({ data: result });
}

export async function completeImage(req, res) {
  const result = await mediaService.complete(req.currentUser.id, req.params.bookId, req.body);
  return res.status(201).json({ data: result });
}

export async function deleteImage(req, res) {
  await mediaService.delete(req.currentUser.id, req.params.bookId, req.params.imageId);
  return res.status(204).send();
}
