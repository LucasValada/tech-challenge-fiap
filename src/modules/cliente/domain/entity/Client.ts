export class Cliente {
  constructor(
    public nome: string,

    public telefone: string | null,
    public email: string | null,
    public cpfCnpj: string,

    public tipoPessoa: 'FISICA' | 'JURIDICA',

    public id?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  IsValidEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!this.email) {
      return false;
    }

    return emailRegex.test(this.email);
  }
}
