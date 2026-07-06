import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { Servico } from '../../../../modules/servico/domain/entity/Servico';
import {
  CreateServicoData,
  ServicoRepository,
  UpdateServicoData,
} from '../../../../modules/servico/domain/repository/servico.repository';
import { ServicosModel } from '../../../../generated/prisma/models';

@Injectable()
export class PrismaServicoRepository implements ServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServicoData): Promise<Servico> {
    const criado = await this.prisma.servicos.create({ data });
    return this.toEntity(criado);
  }

  async findAll(): Promise<{ servico: Servico[]; count: number }> {
    const servicos = await this.prisma.servicos.findMany({
      where: { ativo: true },
    });
    const servico = servicos.map((s) => this.toEntity(s));
    return { servico, count: servico.length };
  }

  async findById(id: string): Promise<Servico | null> {
    const servico = await this.prisma.servicos.findFirst({
      where: { id, ativo: true },
    });
    return servico ? this.toEntity(servico) : null;
  }

  async update(id: string, data: UpdateServicoData): Promise<Servico> {
    const atualizado = await this.prisma.servicos.update({
      where: { id },
      data,
    });
    return this.toEntity(atualizado);
  }

  async delete(id: string): Promise<Servico> {
    const deletado = await this.prisma.servicos.update({
      where: { id },
      data: { ativo: false },
    });
    return this.toEntity(deletado);
  }

  private toEntity(raw: ServicosModel): Servico {
    return new Servico(
      raw.id,
      raw.nome,
      raw.descricao,
      Number(raw.precoBase),
      raw.tempoEstimadoMin,
      raw.ativo,
      raw.createdAt,
      raw.updatedAt,
    );
  }
}
