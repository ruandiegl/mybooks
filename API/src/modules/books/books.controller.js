import { booksService } from './books.service.js';

export async function listBooks(req, res) {
  const result = await booksService.listMine(req.currentUser.id, req.query);
  return res.status(200).json({ data: result });
}

export async function discoverBooks(req, res) {
  const result = await booksService.discover(req.currentUser.id, req.query);
  return res.status(200).json({ data: result });
}

export async function getBook(req, res) {
  const book = await booksService.getById(req.params.id, req.currentUser.id);
  return res.status(200).json({ data: book });
}

export async function createBook(req, res) {
  const book = await booksService.create(req.currentUser.id, req.body);
  return res.status(201).json({ data: book });
}

export async function updateBook(req, res) {
  const book = await booksService.update(req.currentUser.id, req.params.id, req.body);
  return res.status(200).json({ data: book });
}

export async function deleteBook(req, res) {
  await booksService.delete(req.currentUser.id, req.params.id);
  return res.status(204).send();
}
