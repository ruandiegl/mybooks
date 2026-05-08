import express from "express"
import multer from "multer";
import path from 'node:path';

import BookController from './app/controllers/BookController.js';
import UserController from "./app/controllers/UserController.js";
import AuthController from "./app/controllers/AuthController.js";
import privateRoutes from "./app/middlewares/Auth.js"
import BookImageController from "./app/controllers/BookImageController.js";

const router = express.Router();

  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, cb) {
        cb(null, path.resolve(__dirname, '..', 'uploads'))
      }
    })
  });

//Rotas de Login

router.post('/login', AuthController.login)

router.post('/login/register', AuthController.register)

//Rotas de Livros

router.use(privateRoutes)

router.get('/Books', BookController.index);

router.get('/Books/:id', BookController.Show);

router.post('/Books/Create', BookController.Create);

router.put('/Books/:id', BookController.Update)

router.delete('/Books/:id', BookController.Delete);

//Rotas de Imagens

router.post('/Books/:book_id/images', upload.single('image'), BookImageController.uploadImage)

// Rotas de Usuarios

router.get('/Users', UserController.index)

router.get('/Users/withbooks', UserController.showWithBooks)

router.put('/Users/Update/:id', UserController.update)

router.get('/Users/:id', upload.array('image'), UserController.show)

router.post('/Users/Create', UserController.create)

router.delete('/Users/Delete/:id', UserController.delete)

export default router
