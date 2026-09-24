import { isbnService } from './isbn.service.js';
import { isbnParamsSchema } from './isbn.schemas.js';

export async function lookupIsbn(req, res) {
  const { isbn } = isbnParamsSchema.parse(req.params);
  const result = await isbnService.lookup(isbn);
  return res.status(200).json({ data: result });
}
