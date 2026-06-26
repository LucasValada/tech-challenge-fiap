import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';

@Injectable()
export class GetOneClienteUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(id: string) {
    const response = await this.clienteRepository.getOne(id);

    if (!response) {
      throw new NotFoundException('Client not found');
    }

    return response;
  }
}
