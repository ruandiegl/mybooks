import { Router } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler.js';
import {
  createBook,
  deleteBook,
  discoverBooks,
  getBook,
  listBooks,
  updateBook
} from './books.controller.js';

export const booksRouter = Router();

booksRouter.get('/discover', asyncHandler(discoverBooks));
booksRouter.get('/', asyncHandler(listBooks));
booksRouter.post('/', asyncHandler(createBook));
booksRouter.get('/:id', asyncHandler(getBook));
booksRouter.patch('/:id', asyncHandler(updateBook));
booksRouter.delete('/:id', asyncHandler(deleteBook));
