import { Inject, Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';

@Injectable()
export class DeleteClienteUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(id: string) {
    const response = await this.clienteRepository.deleteCliente(id);
    return response;
  }
}
