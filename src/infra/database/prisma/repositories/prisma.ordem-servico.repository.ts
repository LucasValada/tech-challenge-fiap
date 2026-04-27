import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { OrdemServico } from '../../../../modules/ordem-servico/domain/entity/OrdemServico';
import {
  CreateOrdemServicoData,
  OrdemServicoRepository,
  PublicOrdemServicoView,
  UpdateOrdemServicoData,
} from '../../../../modules/ordem-servico/domain/repository/ordem-servico.repository';
import { OrdemServicoModel } from '../../../../generated/prisma/models';

@Injectable()
export class PrismaOrdemServicoRepository implements OrdemServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<{ ordens: OrdemServico[]; count: number }> {
    const ordens = await this.prisma.ordemServico.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return {
      ordens: ordens.map((o) => this.toEntity(o)),
      count: ordens.length,
    };
  }

  async findById(id: string): Promise<OrdemServico | null> {
    const ordem = await this.prisma.ordemServico.findUnique({ where: { id } });
    return ordem ? this.toEntity(ordem) : null;
  }

  async findByCodigo(codigo: string): Promise<OrdemServico | null> {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { codigo },
    });
    return ordem ? this.toEntity(ordem) : null;
  }

  async findPublicByCodigoEPlaca(
    codigo: string,
    placa: string,
  ): Promise<PublicOrdemServicoView | null> {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: { codigo, veiculo: { is: { placa } } },
      include: {
        cliente: { select: { nome: true } },
        veiculo: {
          select: { placa: true, marca: true, modelo: true, ano: true },
        },
        osServicos: {
          select: {
            nomeSnapshot: true,
            precoUnitario: true,
            quantidade: true,
            subtotal: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        osItensEstoque: {
          select: {
            nomeSnapshot: true,
            precoUnitario: true,
            quantidade: true,
            subtotal: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        historicoStatus: {
          select: { status: true, observacao: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ordem) {
      return null;
    }

    return {
      codigo: ordem.codigo,
      status: ordem.status,
      observacoes: ordem.observacoes ?? null,
      valorServicos: Number(ordem.valorServicos),
      valorPecas: Number(ordem.valorPecas),
      valorTotal: Number(ordem.valorTotal),
      createdAt: ordem.createdAt,
      finalizadaAt: ordem.finalizadaAt ?? null,
      entregueAt: ordem.entregueAt ?? null,
      cliente: { nome: ordem.cliente.nome },
      veiculo: {
        placa: ordem.veiculo.placa,
        marca: ordem.veiculo.marca,
        modelo: ordem.veiculo.modelo,
        ano: ordem.veiculo.ano,
      },
      servicos: ordem.osServicos.map((s) => ({
        nomeSnapshot: s.nomeSnapshot,
        precoUnitario: Number(s.precoUnitario),
        quantidade: s.quantidade,
        subtotal: Number(s.subtotal),
      })),
      itens: ordem.osItensEstoque.map((i) => ({
        nomeSnapshot: i.nomeSnapshot,
        precoUnitario: Number(i.precoUnitario),
        quantidade: i.quantidade,
        subtotal: Number(i.subtotal),
      })),
      historicoStatus: ordem.historicoStatus.map((h) => ({
        status: h.status,
        observacao: h.observacao ?? null,
        createdAt: h.createdAt,
      })),
    };
  }

  async create(data: CreateOrdemServicoData): Promise<OrdemServico> {
    const ordem = await this.prisma.ordemServico.create({
      data: {
        codigo: data.codigo,
        clienteId: data.clienteId,
        veiculoId: data.veiculoId,
        usuarioCriadorId: data.usuarioCriadorId,
        observacoes: data.observacoes,
      },
    });
    return this.toEntity(ordem);
  }

  async update(
    id: string,
    data: UpdateOrdemServicoData,
  ): Promise<OrdemServico> {
    const ordem = await this.prisma.ordemServico.update({
      where: { id },
      data: {
        observacoes: data.observacoes,
        status: data.status,
      },
    });
    return this.toEntity(ordem);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ordemServico.delete({ where: { id } });
  }

  private toEntity(raw: OrdemServicoModel): OrdemServico {
    return new OrdemServico(
      raw.clienteId,
      raw.veiculoId,
      raw.usuarioCriadorId,
      raw.status,
      raw.observacoes ?? null,
      Number(raw.valorServicos),
      Number(raw.valorPecas),
      Number(raw.valorTotal),
      raw.codigo,
      raw.id,
      raw.createdAt,
      raw.updatedAt,
      raw.finalizadaAt ?? null,
      raw.entregueAt ?? null,
    );
  }
}
