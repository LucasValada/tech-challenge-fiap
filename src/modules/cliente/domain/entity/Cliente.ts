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
}
