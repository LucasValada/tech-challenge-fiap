import { Inject, Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';
import { buscarClienteOuFalhar } from '../../domain/services/buscarClienteOuFalhar';

@Injectable()
export class DeleteClienteUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await buscarClienteOuFalhar(this.clienteRepository, id);
    await this.clienteRepository.delete(id);
  }
}
