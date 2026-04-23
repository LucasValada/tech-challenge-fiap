import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClientRepository } from '../../cliente.repository';
import { Cliente } from '../entity/Client';

export class ClientPolicyService {
  constructor(
    private clientRepository: ClientRepository,
    private client: Cliente,
  ) {}
  async validateClient(excludeId?: string): Promise<void> {
    if (!this.client.IsValidCpfCnpj()) {
      throw new BadRequestException('Client with not valid cpf or cnpj');
    }

    if (this.client.email) {
      if (!this.client.IsValidEmail()) {
        throw new BadRequestException('Client with not valid email');
      }
    }

    const alreadyExists = await this.clientRepository.getByCpfCnpj(
      this.client.cpfCnpj,
      excludeId,
    );

    if (alreadyExists) {
      throw new ConflictException('Client already exists');
    }

    return;
  }
}
