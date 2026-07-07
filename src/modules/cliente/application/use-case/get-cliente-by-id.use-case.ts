import { Inject, Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';
import { Cliente } from '../../domain/entity/Cliente';
import { buscarClienteOuFalhar } from '../../domain/services/buscarClienteOuFalhar';

@Injectable()
export class GetClienteByIdUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  execute(id: string): Promise<Cliente> {
    return buscarClienteOuFalhar(this.clienteRepository, id);
  }
}
