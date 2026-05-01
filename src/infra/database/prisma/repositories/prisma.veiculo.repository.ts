import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';

@Injectable()
export class PrismaVeiculoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
    clienteId: string;
  }) {
    return this.prisma.veiculo.create({ data });
  }

  async findAll() {
    return this.prisma.veiculo.findMany({ include: { cliente: true } });
  }

  async findById(id: string) {
    return this.prisma.veiculo.findUnique({
      where: { id },
      include: { cliente: true },
    });
  }

  async findByPlaca(placa: string) {
    return this.prisma.veiculo.findUnique({ where: { placa } });
  }

  async update(
    id: string,
    data: {
      placa?: string;
      marca?: string;
      modelo?: string;
      ano?: number;
    },
  ) {
    return this.prisma.veiculo.update({
      where: { id },
      data,
      include: { cliente: true },
    });
  }

  async delete(id: string) {
    return this.prisma.veiculo.delete({ where: { id } });
  }
}
