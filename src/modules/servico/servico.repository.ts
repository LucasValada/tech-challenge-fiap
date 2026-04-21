import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    nome: string;
    descricao?: string;
    precoBase: number;
    tempoEstimadoMin: number;
  }) {
    return this.prisma.servicos.create({ data });
  }

  async findAll() {
    return this.prisma.servicos.findMany({ where: { ativo: true } });
  }

  async findById(id: string) {
    return this.prisma.servicos.findFirst({ where: { id, ativo: true } });
  }

  async update(
    id: string,
    data: {
      nome?: string;
      descricao?: string;
      precoBase?: number;
      tempoEstimadoMin?: number;
    },
  ) {
    return this.prisma.servicos.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.servicos.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
