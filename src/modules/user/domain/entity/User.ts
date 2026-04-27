export class Usuario {
  constructor(
    public id: string,
    public nome: string,
    public email: string,
    public senhaHash: string,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
