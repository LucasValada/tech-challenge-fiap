import { Inject, Injectable } from '@nestjs/common';
import { ClientRepository } from '../../domain/repository/cliente.repository';

@Injectable()
export class GetAllClientUseCase {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute() {
    const response = await this.clientRepository.getAllClient();
    return response;
  }
}
