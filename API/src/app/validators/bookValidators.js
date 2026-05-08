export class BookValidator {
  static validateCreate({ title, description, user_id }) {

    if (!title || title.trim().length < 1 || title.trim().length > 100) {
      throw new Error("O título deve ter entre 1 e 100 caracteres.");
    }

    if (description && description.trim().length > 500) {
      throw new Error("A descrição deve ter no máximo 500 caracteres.");
    }
    
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!user_id || !uuidRegex.test(user_id)) {
      throw new Error("O user_id é obrigatório e deve ser um UUID válido.");
    }
  }
  static validateUpdate({ title }) {
    if (!title || title.trim().length < 1 || title.trim().length > 100) {
      throw new Error("O título deve ter entre 1 e 100 caracteres.");
    }
  }
}
