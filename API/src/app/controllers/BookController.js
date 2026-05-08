
import { prisma } from "../../../prisma/index.js";
import BookRepository from "../Repositories/BookRepository.js";


class bookController {
  async index(req, res) {
    try {
      const books = await BookRepository.findAll();

      console.log(books);

      return res.status(200).json(books)
    } catch (error) {
      console.error('Erro ao buscar Livros', error.message)
      return res.status(500).json({ error: 'Internal Server Error'})
    }
  }

  async Show(req, res) {
    try {
      const { id } = req.params;

    const book = await BookRepository.findById(id);

    if (!book) {
    res.status(404).json({ message: 'Not found'})
  }

    return res.status(200).json(book);
  }catch (error) {
    console.log('Erro ao buscar Livro', error.message)
    return res.status(500).json({ error: 'Internal Server error'})
  }
  }

  async Create(req, res) {
    try {
        const { title, user_id } = req.body

        const newBook = await BookRepository.create({title, user_id})

        res.status(200).json(newBook)
    } catch (error) {
      console.log('Erro ao criar Livro', error.message)
      return res.status(500).json({error: error.message})
    }

  }

  async Update(req, res) {
    try{
      const {id} = req.params
      const { title } = req.body

      const updatedBook = await BookRepository.update(id, { title })

      if (!id) {
        res.status(404).json({ error: "Not Found"})
      }
      res.status(200).json(updatedBook)
    } catch (error) {
      res.status(500).json({error: error.message})
    }

  }

  async Delete(req, res) {

    try {
      const { id } = req.params;

      const book = await BookRepository.findById(id);

      if (!book) {
        res.sendStatus(404).message({ error: 'Not Found'})
      }

      await BookRepository.delete(id)

      res.status(200).json({ message: "Deletado com sucesso "});

    } catch (error) {
      console.log('Erro ao deletar Livro', error.message)
      return res.status(500).json({ error: error.message})
    }
  }
}

export default new bookController();
