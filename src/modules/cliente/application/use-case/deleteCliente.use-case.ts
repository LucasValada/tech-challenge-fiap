import { Inject, Injectable } from '@nestjs/common';
import { ClientRepository } from '../../domain/repository/cliente.repository';

@Injectable()
export class DeleteClientUseCase {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute(id: string) {
    const response = await this.clientRepository.deleteClient(id);
    return response;
  }
}
