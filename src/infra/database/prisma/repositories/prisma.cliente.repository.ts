import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { Cliente } from '../../../../modules/cliente/domain/entity/Cliente';
import {
  ClienteRepository,
  CreateClienteData,
  UpdateClienteData,
} from '../../../../modules/cliente/domain/repository/cliente.repository';
import { ClienteModel } from '../../../../generated/prisma/models';

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClienteData): Promise<Cliente> {
    const criado = await this.prisma.cliente.create({ data });
    return this.toEntity(criado);
  }

  async findAll(): Promise<{ cliente: Cliente[]; count: number }> {
    const clientes = await this.prisma.cliente.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const cliente = clientes.map((c) => this.toEntity(c));
    return { cliente, count: cliente.length };
  }

  async findById(id: string): Promise<Cliente | null> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    return cliente ? this.toEntity(cliente) : null;
  }

  async findByCpfCnpj(
    cpfCnpj: string,
    excludeId?: string,
  ): Promise<Cliente | null> {
    const where = excludeId ? { cpfCnpj, id: { not: excludeId } } : { cpfCnpj };
    const cliente = await this.prisma.cliente.findFirst({ where });
    return cliente ? this.toEntity(cliente) : null;
  }

  async update(id: string, data: UpdateClienteData): Promise<Cliente> {
    const atualizado = await this.prisma.cliente.update({
      where: { id },
      data,
    });
    return this.toEntity(atualizado);
  }

  async delete(id: string): Promise<Cliente> {
    const deletado = await this.prisma.cliente.delete({ where: { id } });
    return this.toEntity(deletado);
  }

  private toEntity(raw: ClienteModel): Cliente {
    return new Cliente(
      raw.nome,
      raw.telefone,
      raw.email,
      raw.cpfCnpj,
      raw.tipoPessoa,
      raw.id,
      raw.createdAt,
      raw.updatedAt,
    );
  }
}
