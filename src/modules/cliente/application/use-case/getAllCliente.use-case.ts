import { Inject } from '@nestjs/common';
import { ClientRepository } from '../../domain/repository/cliente.repository';

export class GetAllClientServices {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute() {
    const response = await this.clientRepository.getAllClient();
    return response;
  }
}
