import { ConflictException } from '@nestjs/common';
import { ItemEstoqueRepository } from '../repository/item-estoque.repository';

export async function garantirSkuUnico(
  itemEstoqueRepository: ItemEstoqueRepository,
  sku: string,
  excludeId?: string,
): Promise<void> {
  const existente = await itemEstoqueRepository.findBySku(sku, excludeId);
  if (existente) {
    throw new ConflictException('SKU ja cadastrado');
  }
}
