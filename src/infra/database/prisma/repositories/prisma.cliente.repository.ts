import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { ClienteRepository } from '../../../../modules/cliente/domain/repository/cliente.repository';
import { Cliente } from '../../../../modules/cliente/domain/entity/Cliente';

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(id: string): Promise<Cliente | null> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      return null;
    }

    return this.ToEntity(cliente);
  }

  async getAllCliente(): Promise<{ cliente: Cliente[]; count: number }> {
    const cliente = await this.prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
        cpfCnpj: true,
        tipoPessoa: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      cliente: cliente.map((c) => this.ToEntity(c)),
      count: cliente.length,
    };
  }

  async createCliente(client: any): Promise<Cliente> {
    const response = await this.prisma.cliente.create({
      data: {
        nome: client.nome,
        telefone: client.telefone,
        email: client.email,
        cpfCnpj: client.cpfCnpj,
        tipoPessoa: client.tipoPessoa,
      },
    });

    return this.ToEntity(response);
  }

  async getByCpfCnpj(
    cpfCnpj: string,
    excludeId?: string,
  ): Promise<Cliente | null> {
    const where = excludeId ? { cpfCnpj, id: { not: excludeId } } : { cpfCnpj };
    const response = await this.prisma.cliente.findFirst({
      where,
    });

    if (!response) {
      return null;
    }

    return this.ToEntity(response);
  }

  async updateCliente(id: string, client: Cliente): Promise<Cliente> {
    const response = await this.prisma.cliente.update({
      where: { id: id },
      data: {
        nome: client.nome,
        telefone: client.telefone,
        email: client.email,
        cpfCnpj: client.cpfCnpj,
        tipoPessoa: client.tipoPessoa,
      },
    });

    return this.ToEntity(response);
  }

  async deleteCliente(id: string): Promise<void> {
    await this.prisma.cliente.delete({
      where: {
        id: id,
      },
      select: {
        id: true,
      },
    });
  }

  ToEntity(client: any): Cliente {
    return new Cliente(
      client.nome,
      client.telefone,
      client.email,
      client.cpfCnpj,
      client.tipoPessoa,
      client.id,
      client.createdAt,
      client.updatedAt,
    );
  }
}
