import { Inject, Injectable } from '@nestjs/common';
import {
  ClienteRepository,
  CreateClienteData,
} from '../../domain/repository/cliente.repository';
import { Cliente } from '../../domain/entity/Cliente';
import { garantirCpfCnpjUnico } from '../../domain/services/garantirCpfCnpjUnico';

@Injectable()
export class CreateClienteUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(data: CreateClienteData): Promise<Cliente> {
    await garantirCpfCnpjUnico(this.clienteRepository, data.cpfCnpj);
    return this.clienteRepository.create({
      nome: data.nome,
      telefone: data.telefone ?? null,
      email: data.email ?? null,
      cpfCnpj: data.cpfCnpj,
      tipoPessoa: data.tipoPessoa,
    });
  }
}
