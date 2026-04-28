export class OSItemEstoqueLinha {
  constructor(
    public ordemServicoId: string,
    public itemEstoqueId: string,
    public nomeSnapshot: string,
    public precoUnitario: number,
    public quantidade: number,
    public subtotal: number,
    public id?: string,
    public createdAt?: Date,
  ) {}
}
