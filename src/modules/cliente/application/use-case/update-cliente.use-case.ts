import { Inject, Injectable } from '@nestjs/common';
import {
  ClienteRepository,
  UpdateClienteData,
} from '../../domain/repository/cliente.repository';
import { Cliente } from '../../domain/entity/Cliente';
import { buscarClienteOuFalhar } from '../../domain/services/buscarClienteOuFalhar';
import { garantirCpfCnpjUnico } from '../../domain/services/garantirCpfCnpjUnico';

@Injectable()
export class UpdateClienteUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(id: string, data: UpdateClienteData): Promise<Cliente> {
    await buscarClienteOuFalhar(this.clienteRepository, id);
    if (data.cpfCnpj) {
      await garantirCpfCnpjUnico(this.clienteRepository, data.cpfCnpj, id);
    }
    return this.clienteRepository.update(id, data);
  }
}
