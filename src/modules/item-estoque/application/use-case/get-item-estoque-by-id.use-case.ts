import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ItemEstoqueRepository } from '../../domain/repository/item-estoque.repository';
import { ItemEstoque } from '../../domain/entity/ItemEstoque';

@Injectable()
export class GetItemEstoqueByIdUseCase {
  constructor(
    @Inject('ITEM_ESTOQUE_REPOSITORY')
    private readonly itemEstoqueRepository: ItemEstoqueRepository,
  ) {}

  async execute(id: string): Promise<ItemEstoque> {
    const item = await this.itemEstoqueRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Item de estoque não encontrado');
    }
    return item;
  }
}
