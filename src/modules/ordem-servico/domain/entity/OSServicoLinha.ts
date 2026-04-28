export class OSServicoLinha {
  constructor(
    public ordemServicoId: string,
    public servicoId: string,
    public nomeSnapshot: string,
    public precoUnitario: number,
    public quantidade: number,
    public subtotal: number,
    public id?: string,
    public createdAt?: Date,
  ) {}
}
