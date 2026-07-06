import { Inject, Injectable } from '@nestjs/common';
import { ItemEstoqueRepository } from '../../domain/repository/item-estoque.repository';
import { ItemEstoque } from '../../domain/entity/ItemEstoque';
import { garantirSkuUnico } from '../../domain/services/garantirSkuUnico';

@Injectable()
export class CreateItemEstoqueUseCase {
  constructor(
    @Inject('ITEM_ESTOQUE_REPOSITORY')
    private readonly itemEstoqueRepository: ItemEstoqueRepository,
  ) {}

  async execute(data: {
    nome: string;
    tipo: 'PECA' | 'INSUMO';
    sku: string;
    descricao?: string;
    precoUnitario: number;
    quantidadeEstoque: number;
    estoqueMinimo: number;
  }): Promise<ItemEstoque> {
    await garantirSkuUnico(this.itemEstoqueRepository, data.sku);
    return this.itemEstoqueRepository.create(data);
  }
}
