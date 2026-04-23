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

  IsValidCpfCnpj() {
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

    switch (this.tipoPessoa) {
      case 'FISICA':
        return cpfRegex.test(this.cpfCnpj);
      case 'JURIDICA':
        return cnpjRegex.test(this.cpfCnpj);
    }
  }
}
