import { Router } from 'express';
import { asyncHandler } from '../shared/http/asyncHandler.js';
import { authenticate, attachCurrentUser } from '../modules/auth/auth.middleware.js';
import { booksRouter } from '../modules/books/books.routes.js';
import { discoverBooks } from '../modules/books/books.controller.js';
import { chatRouter } from '../modules/chat/chat.routes.js';
import { isbnRouter } from '../modules/isbn/isbn.routes.js';
import { matchesRouter } from '../modules/matches/matches.routes.js';
import { mediaRouter } from '../modules/media/media.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.use(authenticate, asyncHandler(attachCurrentUser));
apiRouter.get('/discover', asyncHandler(discoverBooks));
apiRouter.use(usersRouter);
apiRouter.use('/books/:bookId/images', mediaRouter);
apiRouter.use('/books', booksRouter);
apiRouter.use('/isbn', isbnRouter);
apiRouter.use(matchesRouter);
apiRouter.use('/conversations', chatRouter);
