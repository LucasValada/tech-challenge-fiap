export class Servico {
  constructor(
    public id: string,
    public nome: string,
    public descricao: string | null,
    public precoBase: number,
    public tempoEstimadoMin: number,
    public ativo: boolean,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
