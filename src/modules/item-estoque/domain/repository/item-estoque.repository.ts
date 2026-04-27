import { ItemEstoque } from '../entity/ItemEstoque';

export const ITEM_ESTOQUE_REPOSITORY = 'ITEM_ESTOQUE_REPOSITORY';

export interface ItemEstoqueRepository {
  create(data: {
    nome: string;
    tipo: 'PECA' | 'INSUMO';
    sku: string;
    descricao?: string;
    precoUnitario: number;
    quantidadeEstoque: number;
    estoqueMinimo: number;
  }): Promise<ItemEstoque>;

  findAll(tipo?: 'PECA' | 'INSUMO'): Promise<ItemEstoque[]>;

  findById(id: string): Promise<ItemEstoque | null>;

  findBySku(sku: string): Promise<ItemEstoque | null>;

  findBaixoEstoque(): Promise<ItemEstoque[]>;

  update(
    id: string,
    data: {
      nome?: string;
      tipo?: 'PECA' | 'INSUMO';
      sku?: string;
      descricao?: string;
      precoUnitario?: number;
      quantidadeEstoque?: number;
      estoqueMinimo?: number;
    },
  ): Promise<ItemEstoque>;

  delete(id: string): Promise<ItemEstoque>;
}
