
export function userDTOF(user) {
  if (!user) return null
  const {passHash: _, ...data} = user

  return data
}

