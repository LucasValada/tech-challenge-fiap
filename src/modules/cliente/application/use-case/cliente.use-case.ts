import { Inject, NotFoundException } from '@nestjs/common';
import { ClientRepository } from '../../cliente.repository';
import { ClientDto } from '../dto/client.dto';
import { Cliente } from '../../domain/entity/Client';
import { ClientPolicyService } from '../../domain/service/ClientPolicy.service';

export class clientServices {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: ClientRepository,
  ) {}

  async getAllClient() {
    const response = await this.clientRepository.getAllClient();
    return response;
  }

  async getOneClient(id: string) {
    const response = await this.clientRepository.getOne(id);

    if (!response) {
      throw new NotFoundException('Client not found');
    }

    return response;
  }

  async createClient(data: ClientDto) {
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

  async updateClient(id: string, data: ClientDto) {
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

  async deleteClient(id: string) {
    const response = await this.clientRepository.deleteClient(id);
    return response;
  }
}
