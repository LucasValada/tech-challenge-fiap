import { Inject, NotFoundException } from '@nestjs/common';
import { ClientRepository } from '../../domain/repository/cliente.repository';

export class GetOneClienteUseCase {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute(id: string) {
    const response = await this.clientRepository.getOne(id);

    if (!response) {
      throw new NotFoundException('Client not found');
    }

    return response;
  }
}
