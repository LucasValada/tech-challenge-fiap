import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { ClientRepository } from '../../cliente.repository';
import { createClientDto, updateClientDto } from '../dto/client.dto';
import { Cliente } from '../../domain/entity/Client';

export class clientServices {
  constructor(
    @Inject('CLIENT_REPOSITORY')
    private clientRepository: ClientRepository,
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

  async createClient(data: createClientDto) {
    const client = new Cliente(
      data.nome,
      data.telefone,
      data.email,
      data.cpfCnpj,
      data.tipoPessoa,
    );

    if (client.email) {
      if (!client.IsValidEmail()) {
        throw new NotFoundException('Client not found');
      }
    }

    const duplicate = await this.clientRepository.getByCpfCnpj(client.cpfCnpj);
    if (duplicate) {
      throw new ConflictException('Client already exists');
    }

    const response = await this.clientRepository.createClient(client);
    return response;
  }

  async updateClient(id: string, data: updateClientDto) {
    const client = new Cliente(
      data.nome,
      data.telefone,
      data.email,
      data.cpfCnpj,
      data.tipoPessoa,
      id,
    );

    const response = await this.clientRepository.updateClient(client.id, client);
    return response;
  }

  async deleteClient(id: string) {
    const response = await this.clientRepository.deleteClient(id);
    return response;
  }
}
