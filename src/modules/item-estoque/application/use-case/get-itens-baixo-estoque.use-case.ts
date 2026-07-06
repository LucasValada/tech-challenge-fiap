import { Inject, Injectable } from '@nestjs/common';
import { ItemEstoqueRepository } from '../../domain/repository/item-estoque.repository';
import { ItemEstoque } from '../../domain/entity/ItemEstoque';

@Injectable()
export class GetItensBaixoEstoqueUseCase {
  constructor(
    @Inject('ITEM_ESTOQUE_REPOSITORY')
    private readonly itemEstoqueRepository: ItemEstoqueRepository,
  ) {}

  execute(): Promise<{ itemEstoque: ItemEstoque[]; count: number }> {
    return this.itemEstoqueRepository.findBaixoEstoque();
  }
}
