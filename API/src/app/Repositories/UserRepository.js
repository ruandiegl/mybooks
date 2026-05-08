import { prisma } from "../../../prisma/index.js";
import { UserValidator } from "../validators/userValidators.js";

class userRepository {
  async findAll() {
    const rows = prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        email: true,
      }
    })
    return rows;
  }

  async findById(id) {
    const row  = await prisma.user.findUnique({ where: { id: id }});

    return row;
  }

  async findByEmail(email) {
    const  row  = await prisma.user.findUnique({ where: {email: email} })

    return row
  }

  async findUserWithBook() {
    const rows = await prisma.user.findMany({
      include: {
        books: {
          select: {
            id: true,
            title: true,
          }
        },
        bookImage: {
          select: {
            
          }
        }
      }
    })
    return rows
  }

  async create({ name, email, phone, passHash}) {
    UserValidator.validate({name, email, phone})

    const row = await prisma.user.create({
      data: {
        name: name,
        email: email,
        phone: phone,
        passHash: passHash
       }
    })

      return row
  }

  async update(id, {name, phone, email,passHash}) {
    UserValidator.validate({ name, phone, email})

   const row = await prisma.user.update({
    where: { id: id},
    data: {
      name: name,
      email: email,
      phone: phone,
      passHash: passHash
    }
   })

    return row
  }

  async delete(id) {
   const deleteBk = await prisma.book.deleteMany({
    where: { user_id: id}
   })
   const deleteUsers = await prisma.user.deleteMany({
    where: { id: id}
   })

   return deleteUsers
  }
}

export default new userRepository()
