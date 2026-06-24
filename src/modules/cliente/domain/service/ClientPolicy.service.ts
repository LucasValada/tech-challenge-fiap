import { BadRequestException, ConflictException } from '@nestjs/common';
import { ClientRepository } from '../repository/cliente.repository';
import { Cliente } from '../entity/Client';

export class ClientPolicyService {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly client: Cliente,
  ) {}
  async validateClient(excludeId?: string): Promise<void> {
    if (this.client.email && !this.client.IsValidEmail()) {
      throw new BadRequestException('Client with not valid email');
    }

    const alreadyExists = await this.clientRepository.getByCpfCnpj(
      this.client.cpfCnpj,
      excludeId,
    );

    if (alreadyExists) {
      throw new ConflictException('Client already exists');
    }
  }
}
