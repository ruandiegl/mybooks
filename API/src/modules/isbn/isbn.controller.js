import { isbnService } from './isbn.service.js';

export async function lookupIsbn(req, res) {
  const result = await isbnService.lookup(req.params.isbn);
  return res.status(200).json({ data: result });
}
