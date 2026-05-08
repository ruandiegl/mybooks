import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import UserRepository from "../Repositories/UserRepository.js"

class AuthController {
  async register(req, res) {
    try {

      const {name, email, phone, password} = req.body

      if(!email) {
           return res.status(400).json({ message: 'Preencha o nome'})
         }
      if(!password) {
           return res.status(400).json({ message: 'Preencha a Senha'})
         }

      const user = await UserRepository.findAll()
      const existingEmail = await user.find(user => user.email === email)

      if(existingEmail) {
        return res.status(400).json({ message: 'email já cadastrado'})
      }

      const passHash = await bcrypt.hash(password, 10)

      console.log(passHash)

      const newUser = await UserRepository.create({
        name,
        email,
        phone,
        passHash
      })

      return res.status(200).json({
        usuario: {
          nome: newUser.name,
          email: newUser.email
        }
      })
    }catch (error) {
      return res.status(500).json({ error: error.message})
    }
  }

  async login(req, res) {
    const { email, password } = req.body

    try {
      if(!email) {
        return res.status(400).json({ message: 'Preencha o Email'})
      }
      if(!password) {
        return res.status(400).json({ message: 'Preencha a Senha'})
      }

      const user = await UserRepository.findByEmail(email)

      const fakeHash = '$2b$10$C8h7Kx6dL0U0uD3bY4QbCu0K4IVhSR2UQWhZbb7FZQ4y6UwX0EJ1S';
      const passHash = user ? user.passHash : fakeHash;

      const passwordMatch = await bcrypt.compare(password, passHash)

      if (!user || !passwordMatch) {
        return res.status(401).json({message: 'Email ou Senha Incorretos.'})
      }

      const { passHash: _, ...userData} = user

      return res.status(200).json({
        message: 'login bem sucedido',
        user: userData,
        token: jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: "5d"})
      })
    } catch(error) {
      return res.status(500).json({ error: error.message})
    }
  }
}

export default new AuthController()
