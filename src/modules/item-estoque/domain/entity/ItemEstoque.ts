export class ItemEstoque {
  constructor(
    public id: string,
    public nome: string,
    public tipo: 'PECA' | 'INSUMO',
    public sku: string,
    public descricao: string | null,
    public precoUnitario: number,
    public quantidadeEstoque: number,
    public estoqueMinimo: number,
    public ativo: boolean,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
