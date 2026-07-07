import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import {
  CreateVeiculoData,
  UpdateVeiculoData,
  VeiculoComCliente,
  VeiculoRepository,
} from '../../../../modules/veiculo/domain/repository/veiculo.repository';
import { Veiculo } from '../../../../modules/veiculo/domain/entity/Veiculo';

@Injectable()
export class PrismaVeiculoRepository implements VeiculoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateVeiculoData): Promise<Veiculo> {
    return this.prisma.veiculo.create({ data });
  }

  async findAll(): Promise<{ veiculo: VeiculoComCliente[]; count: number }> {
    const veiculo = await this.prisma.veiculo.findMany({
      include: { cliente: true },
    });
    return { veiculo, count: veiculo.length };
  }

  async findById(id: string): Promise<VeiculoComCliente | null> {
    return this.prisma.veiculo.findUnique({
      where: { id },
      include: { cliente: true },
    });
  }

  async findByPlaca(
    placa: string,
    excludeId?: string,
  ): Promise<Veiculo | null> {
    const where = excludeId ? { placa, NOT: { id: excludeId } } : { placa };
    return this.prisma.veiculo.findFirst({ where });
  }

  async update(id: string, data: UpdateVeiculoData): Promise<VeiculoComCliente> {
    return this.prisma.veiculo.update({
      where: { id },
      data,
      include: { cliente: true },
    });
  }

  async delete(id: string): Promise<Veiculo> {
    return this.prisma.veiculo.delete({ where: { id } });
  }
}
