import jwt from 'jsonwebtoken'

export default (req, res, next) => {
  const authToken = req.headers.authorization

  if(!authToken) {
    return res.status(401).json({ message: 'Token não enviado'})
  }

  const cleanToken = authToken.split(' ')[1]

  console.log(cleanToken)

  try{
    jwt.verify(cleanToken, process.env.JWT_SECRET, function(err, decoded) {
      if(err) {
        throw new Error
      }

      req.user_id = decoded.id
      return next()
    })
  }catch (error) {
    return res.status(401).json({ error: "Token Invalido"})
  }
}
