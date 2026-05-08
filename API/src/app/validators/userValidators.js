export class UserValidator {
  static validate({ name, email, phone }) {

    if (!name || name.trim().length < 3 || name.length > 50) {
      throw new Error("O nome deve ter entre 3 e 50 caracteres.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("E-mail inválido.");
    }

    const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error("Telefone inválido. Use o formato (xx) xxxxx-xxxx.");
    }
  }
}
