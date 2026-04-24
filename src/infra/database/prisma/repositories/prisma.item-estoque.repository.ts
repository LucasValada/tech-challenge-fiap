import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';

@Injectable()
export class PrismaItemEstoqueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    nome: string;
    tipo: 'PECA' | 'INSUMO';
    sku: string;
    descricao?: string;
    precoUnitario: number;
    quantidadeEstoque: number;
    estoqueMinimo: number;
  }) {
    return this.prisma.itemEstoque.create({ data });
  }

  async findAll(tipo?: 'PECA' | 'INSUMO') {
    return this.prisma.itemEstoque.findMany({
      where: {
        ativo: true,
        ...(tipo && { tipo }),
      },
    });
  }

  async findById(id: string) {
    return this.prisma.itemEstoque.findFirst({
      where: { id, ativo: true },
    });
  }

  async findBySku(sku: string) {
    return this.prisma.itemEstoque.findUnique({ where: { sku } });
  }

  async findBaixoEstoque() {
    return this.prisma.$queryRaw`
      SELECT * FROM "ItemEstoque"
      WHERE "quantidadeEstoque" <= "estoqueMinimo" AND "ativo" = true
    `;
  }

  async update(
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
  ) {
    return this.prisma.itemEstoque.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.itemEstoque.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
