import { mediaService } from './media.service.js';
import { booksService } from '../books/books.service.js';

export async function presignImage(req, res) {
  const result = await mediaService.presign(req.currentUser.id, req.params.bookId, req.body);
  return res.status(201).json({ data: result });
}

export async function completeImage(req, res) {
  const result = await mediaService.complete(req.currentUser.id, req.params.bookId, req.body);
  return res.status(201).json({ data: result });
}

export async function reorderImages(req, res) {
  await mediaService.reorder(req.currentUser.id, req.params.bookId, req.body);
  const book = await booksService.getById(req.params.bookId, req.currentUser.id);
  return res.status(200).json({ data: book });
}

export async function deleteImage(req, res) {
  await mediaService.delete(req.currentUser.id, req.params.bookId, req.params.imageId);
  return res.status(204).send();
}
