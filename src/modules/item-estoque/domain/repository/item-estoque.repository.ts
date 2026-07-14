import { ItemEstoque } from '../entity/ItemEstoque';

export interface CreateItemEstoqueData {
  nome: string;
  tipo: 'PECA' | 'INSUMO';
  sku: string;
  descricao?: string;
  precoUnitario: number;
  quantidadeEstoque: number;
  estoqueMinimo: number;
}

export interface UpdateItemEstoqueData {
  nome?: string;
  tipo?: 'PECA' | 'INSUMO';
  sku?: string;
  descricao?: string;
  precoUnitario?: number;
  quantidadeEstoque?: number;
  estoqueMinimo?: number;
}

export interface ItemEstoqueRepository {
  create(data: CreateItemEstoqueData): Promise<ItemEstoque>;
  findAll(
    tipo?: 'PECA' | 'INSUMO',
  ): Promise<{ itemEstoque: ItemEstoque[]; count: number }>;
  findById(id: string): Promise<ItemEstoque | null>;
  findBySku(sku: string, excludeId?: string): Promise<ItemEstoque | null>;
  findBaixoEstoque(): Promise<{ itemEstoque: ItemEstoque[]; count: number }>;
  update(id: string, data: UpdateItemEstoqueData): Promise<ItemEstoque>;
  delete(id: string): Promise<ItemEstoque>;
}
