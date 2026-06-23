import { Inject } from '@nestjs/common';
import { ClientRepository } from '../../domain/repository/cliente.repository';
import { ClientDto } from '../dto/client.dto';
import { Cliente } from '../../domain/entity/Client';
import { ClientPolicyService } from '../../domain/service/ClientPolicy.service';

export class UpdateClienteUseCase {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute(id: string, data: ClientDto) {
    const client = new Cliente(
      data.nome,
      data.telefone,
      data.email,
      data.cpfCnpj,
      data.tipoPessoa,
      id,
    );

    const clientPolicy = new ClientPolicyService(this.clientRepository, client);
    await clientPolicy.validateClient(id);

    const response = await this.clientRepository.updateClient(id, client);
    return response;
  }
}
