import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { ServicoRepository } from '../../../../modules/servico/domain/repository/servico.repository';
import { Servico } from '../../../../modules/servico/domain/entity/Servico';

@Injectable()
export class PrismaServicoRepository implements ServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    nome: string;
    descricao?: string;
    precoBase: number;
    tempoEstimadoMin: number;
  }): Promise<Servico> {
    const response = await this.prisma.servicos.create({ data });
    return this.ToEntity(response);
  }

  async findAll() {
    const response = await this.prisma.servicos.findMany({
      where: { ativo: true },
    });
    return response.map((s) => this.ToEntity(s));
  }

  async findById(id: string) {
    const response = await this.prisma.servicos.findFirst({
      where: { id, ativo: true },
    });
    return this.ToEntity(response);
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
    const response = await this.prisma.servicos.update({ where: { id }, data });
    return this.ToEntity(response);
  }

  async delete(id: string) {
    const response = await this.prisma.servicos.update({
      where: { id },
      data: { ativo: false },
    });
    return this.ToEntity(response);
  }

  ToEntity(servico: any): Servico {
    return new Servico(
      servico.id,
      servico.nome,
      servico.descricao,
      servico.precoBase,
      servico.tempoEstimadoMin,
      servico.ativo,
      servico.createdAt,
      servico.updatedAt,
    );
  }
}
