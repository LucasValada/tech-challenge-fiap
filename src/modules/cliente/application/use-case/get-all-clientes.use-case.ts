import { Inject, Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../domain/repository/cliente.repository';
import { Cliente } from '../../domain/entity/Cliente';

@Injectable()
export class GetAllClientesUseCase {
  constructor(
    @Inject('CLIENTE_REPOSITORY')
    private readonly clienteRepository: ClienteRepository,
  ) {}

  execute(): Promise<{ cliente: Cliente[]; count: number }> {
    return this.clienteRepository.findAll();
  }
}
