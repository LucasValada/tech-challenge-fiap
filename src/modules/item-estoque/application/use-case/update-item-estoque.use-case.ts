import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ItemEstoqueRepository } from '../../domain/repository/item-estoque.repository';
import { ItemEstoque } from '../../domain/entity/ItemEstoque';
import { garantirSkuUnico } from '../../domain/services/garantirSkuUnico';

@Injectable()
export class UpdateItemEstoqueUseCase {
  constructor(
    @Inject('ITEM_ESTOQUE_REPOSITORY')
    private readonly itemEstoqueRepository: ItemEstoqueRepository,
  ) {}

  async execute(
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
  ): Promise<ItemEstoque> {
    const item = await this.itemEstoqueRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Item de estoque nao encontrado');
    }
    if (data.sku) {
      await garantirSkuUnico(this.itemEstoqueRepository, data.sku, id);
    }
    return this.itemEstoqueRepository.update(id, data);
  }
}
