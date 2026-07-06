import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ItemEstoqueRepository } from '../../domain/repository/item-estoque.repository';

@Injectable()
export class DeleteItemEstoqueUseCase {
  constructor(
    @Inject('ITEM_ESTOQUE_REPOSITORY')
    private readonly itemEstoqueRepository: ItemEstoqueRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const item = await this.itemEstoqueRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Item de estoque nao encontrado');
    }
    await this.itemEstoqueRepository.delete(id);
  }
}
