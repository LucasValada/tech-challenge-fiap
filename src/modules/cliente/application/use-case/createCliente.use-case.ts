import { Inject } from '@nestjs/common';
import { ClientRepository } from '../../domain/repository/cliente.repository';
import { ClientDto } from '../dto/client.dto';
import { Cliente } from '../../domain/entity/Client';
import { ClientPolicyService } from '../../domain/service/ClientPolicy.service';

export class CreateClienteUseCase {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute(data: ClientDto) {
    const client = new Cliente(
      data.nome,
      data.telefone,
      data.email,
      data.cpfCnpj,
      data.tipoPessoa,
    );

    const clientPolicy = new ClientPolicyService(this.clientRepository, client);
    await clientPolicy.validateClient();

    const response = await this.clientRepository.createClient(client);
    return response;
  }
}
