import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { ItemEstoque } from '../../../../modules/item-estoque/domain/entity/ItemEstoque';
import {
  CreateItemEstoqueData,
  ItemEstoqueRepository,
  UpdateItemEstoqueData,
} from '../../../../modules/item-estoque/domain/repository/item-estoque.repository';
import { ItemEstoqueModel } from '../../../../generated/prisma/models';

@Injectable()
export class PrismaItemEstoqueRepository implements ItemEstoqueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateItemEstoqueData): Promise<ItemEstoque> {
    const criado = await this.prisma.itemEstoque.create({ data });
    return this.toEntity(criado);
  }

  async findAll(
    tipo?: 'PECA' | 'INSUMO',
  ): Promise<{ itemEstoque: ItemEstoque[]; count: number }> {
    const itens = await this.prisma.itemEstoque.findMany({
      where: {
        ativo: true,
        ...(tipo && { tipo }),
      },
    });
    const itemEstoque = itens.map((i) => this.toEntity(i));
    return { itemEstoque, count: itemEstoque.length };
  }

  async findById(id: string): Promise<ItemEstoque | null> {
    const item = await this.prisma.itemEstoque.findFirst({
      where: { id, ativo: true },
    });
    return item ? this.toEntity(item) : null;
  }

  async findBySku(
    sku: string,
    excludeId?: string,
  ): Promise<ItemEstoque | null> {
    const where = excludeId ? { sku, NOT: { id: excludeId } } : { sku };
    const item = await this.prisma.itemEstoque.findFirst({ where });
    return item ? this.toEntity(item) : null;
  }

  async findBaixoEstoque(): Promise<{
    itemEstoque: ItemEstoque[];
    count: number;
  }> {
    const itens = await this.prisma.$queryRaw<ItemEstoqueModel[]>`
      SELECT * FROM "ItemEstoque"
      WHERE "quantidadeEstoque" <= "estoqueMinimo" AND "ativo" = true
    `;
    const itemEstoque = itens.map((i) => this.toEntity(i));
    return { itemEstoque, count: itemEstoque.length };
  }

  async update(id: string, data: UpdateItemEstoqueData): Promise<ItemEstoque> {
    const atualizado = await this.prisma.itemEstoque.update({
      where: { id },
      data,
    });
    return this.toEntity(atualizado);
  }

  async delete(id: string): Promise<ItemEstoque> {
    const deletado = await this.prisma.itemEstoque.update({
      where: { id },
      data: { ativo: false },
    });
    return this.toEntity(deletado);
  }

  private toEntity(raw: ItemEstoqueModel): ItemEstoque {
    return new ItemEstoque(
      raw.id,
      raw.nome,
      raw.tipo,
      raw.sku,
      raw.descricao,
      Number(raw.precoUnitario),
      raw.quantidadeEstoque,
      raw.estoqueMinimo,
      raw.ativo,
      raw.createdAt,
      raw.updatedAt,
    );
  }
}
