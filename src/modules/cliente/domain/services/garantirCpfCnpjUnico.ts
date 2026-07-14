import { ConflictException } from '@nestjs/common';
import { ClienteRepository } from '../repository/cliente.repository';

export async function garantirCpfCnpjUnico(
  clienteRepository: ClienteRepository,
  cpfCnpj: string,
  excludeId?: string,
): Promise<void> {
  const existente = await clienteRepository.findByCpfCnpj(cpfCnpj, excludeId);
  if (existente) {
    throw new ConflictException('CPF/CNPJ já cadastrado');
  }
}
