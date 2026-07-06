import { BadRequestException, ConflictException } from '@nestjs/common';
import { ClienteRepository } from '../repository/cliente.repository';
import { Cliente } from '../entity/Cliente';

export class ClientePolicyService {
  constructor(
    private readonly clienteRepository: ClienteRepository,
    private readonly client: Cliente,
  ) {}
  async validateClient(excludeId?: string): Promise<void> {
    if (this.client.email && !this.client.IsValidEmail()) {
      throw new BadRequestException('Client with not valid email');
    }

    const alreadyExists = await this.clienteRepository.getByCpfCnpj(
      this.client.cpfCnpj,
      excludeId,
    );

    if (alreadyExists) {
      throw new ConflictException('Client already exists');
    }
  }
}
