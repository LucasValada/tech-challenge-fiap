import { ConflictException } from '@nestjs/common';
import { VeiculoRepository } from '../repository/veiculo.repository';

export async function garantirPlacaUnica(
  veiculoRepository: VeiculoRepository,
  placa: string,
  excludeId?: string,
): Promise<void> {
  const existente = await veiculoRepository.findByPlaca(placa, excludeId);
  if (existente) {
    throw new ConflictException('Placa ja cadastrada');
  }
}
