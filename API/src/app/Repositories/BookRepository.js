import { prisma } from "../../../prisma/index.js";
import { BookValidator } from "../validators/bookValidators.js";

class BooksRepository {
  async findAll() {
    const rows = await prisma.book.findMany()
    return rows
  }

  async findById(id) {
   const row = await prisma.book.findUnique({
    where: { id }
   })
   return row
  }

  async create({ title, user_id }) {
    BookValidator.validateCreate({title, user_id})

    const row = await prisma.book.create({
      data: {
        title: title,
        user: {
          connect: { id: user_id}
        }
      }
    })

      return row
  }

  async update(id, {title}) {
    BookValidator.validateUpdate({title})

    const row = await prisma.book.update({
      where: {id: id},
      data: {title}
    })

      return row
  }

  async delete(id) {
      const deleteBook = await prisma.book.delete(
      {where: {id: id}}
      )

    return deleteBook
  }
}

export default new BooksRepository()
