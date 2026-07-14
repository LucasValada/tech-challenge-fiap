import { NotFoundException } from '@nestjs/common';
import { Cliente } from '../entity/Cliente';
import { ClienteRepository } from '../repository/cliente.repository';

export async function buscarClienteOuFalhar(
  clienteRepository: ClienteRepository,
  id: string,
): Promise<Cliente> {
  const cliente = await clienteRepository.findById(id);
  if (!cliente) {
    throw new NotFoundException('Cliente não encontrado');
  }
  return cliente;
}
