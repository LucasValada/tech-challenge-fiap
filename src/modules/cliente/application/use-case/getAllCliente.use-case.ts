import { Inject, Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';

@Injectable()
export class GetAllClienteUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute() {
    const response = await this.clienteRepository.getAllCliente();
    return response;
  }
}
