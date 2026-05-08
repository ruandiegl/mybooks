import BookImageRepository from "../Repositories/BookImageRepository.js"
import BookRepository from "../Repositories/BookRepository.js"

class BookImageController {
    async uploadImage(req, res) {
      try {
        const { book_id } = req.params
        const user_id = req.user.id

        if(!req.file) {
          return res.status(400).json({ error: 'No file uploaded'})
        }

        const book = await BookRepository.findById(book_id, user_id)

        if (!book) {
          return res.status(404).json({ error: 'Book not found'})
        }

        const imageUrl = `/uploads/books/${req.file.filename}`;

        const image = await BookImageRepository.create({
          url: imageUrl,
          book_id: book_id,
          isCover: false,
        });

        res.status(200).json(image)
      } catch (error) {
        return res.status(500).json({ error: error.message})
      }
    }
}

export default new BookImageController()
