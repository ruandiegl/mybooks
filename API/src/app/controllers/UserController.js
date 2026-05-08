import { userDTOF } from "../DTO/userDTO.js";
import UserRepository from "../Repositories/UserRepository.js";

class userController {
  async index(req,res) {
    try {
      const Users = await UserRepository.findAll()

      const safeUsers = Users.map(userDTOF)

      res.status(200).json(safeUsers)
    } catch (error) {
      console.error('Erro ao buscar usuarios', error.message)
      return res.statu(500).json({ error: 'Internal Server Error'})
    }

  }

  async show(req,res) {
    try {
      const { id } = req.params

      const user = await UserRepository.findById(id)

      // const safeUser = userDTOF(user)

      console.log(req.user_id)
      res.status(200).json(user)
    } catch (error) {
      console.error('erro ao buscar usuarios', error.message)
      return res.status(500).json({ error: 'Internal server error.'})
    }
  }

  async showWithBooks(req,res) {
    try {
      const users = await UserRepository.findUserWithBook()


      const safeUser = users.map(userDTOF)

      console.log(safeUser)
      return res.status(200).json(safeUser)
    } catch (error) {
      console.error('erro ao buscar usuarios', error.message)
      return res.status(500).json({ error: 'Internal server error.'})
    }
  }

  async create(req,res) {
    try {
      const {name, phone, email} = req.body

       if(!name) {
         return res.status(400).json({ message: 'Preencha o nome'})
       }

       const users = await UserRepository.findAll()
       const existingEmail = await users.find(user => user.email === email)

       if (existingEmail) {
         return res.status(400).json([{ error: 'email already in use'}])
       }
      const newUser = await UserRepository.create({name, email, phone})

      res.status(200).json(userDTO.toList(newUser))
    } catch (error) {
      console.error('erro ao criar usuarios.', error.message)
      return res.status(500).json({ error: error.message})
    }
  }

  async update(req,res) {
    try {
    const { id } = req.params
    const { name, phone, email} = req.body

    const user = await UserRepository.findById(id)

    if (!user) {
      return res.status(404).json({ error: "Not Found"})
    }

    const existingEmail = await UserRepository.findByEmail(email).catch(() => null)

    if(existingEmail && existingEmail.id !== id) {
      return res.status(400).json({ error: 'Email ja em uso por outro usuário.'})
    }


    const updatedUser = await UserRepository.update(id, {name,email,phone})



    return res.status(200).json(userDTOF(updatedUser))
    } catch(error) {
      console.error('Erro ao atualizar usuario', error.message)
      return res.status(500).json({ error: 'Internal server error.'})
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params

      const user = await UserRepository.findById(id)

      if (!user) {
        return res.status(404).json({ error: "Not Found"})
      }

      const deletedUser = await UserRepository.delete(id)

      return res.status(200).json({ message: "Deletado com sucesso",})
    } catch (error) {
      console.error('erro ao buscar usuarios', error.message)
      return res.status(500).json({ error: 'Internal server error.'})
    }
  }
}

export default new userController()
