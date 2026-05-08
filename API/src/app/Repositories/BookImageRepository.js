class BookImageRepository {
  async index(bookId) {

    return [];
  }
  async create({ book_id, url }) {
    const row = await prisma.bookImage.create({
      data: {
        book: {
          connect: { id: book_id }
        },
        url: url
      }
    })
    return row

  }

}

export default new BookImageRepository();
