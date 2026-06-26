import { Inject, Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';
import { ClienteDto } from '../dto/cliente.dto';
import { Cliente } from '../../domain/entity/Cliente';
import { ClientePolicyService } from '../../domain/service/ClientePolicy.service';

@Injectable()
export class CreateClienteUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(data: ClienteDto) {
    const client = new Cliente(
      data.nome,
      data.telefone,
      data.email,
      data.cpfCnpj,
      data.tipoPessoa,
    );

    const clientePolicy = new ClientePolicyService(this.clienteRepository, client);
    await clientePolicy.validateClient();

    const response = await this.clienteRepository.createCliente(client);
    return response;
  }
}
