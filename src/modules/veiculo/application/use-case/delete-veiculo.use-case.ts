import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { VeiculoRepository } from '../../domain/repository/veiculo.repository';

@Injectable()
export class DeleteVeiculoUseCase {
  constructor(
    @Inject('VEICULO_REPOSITORY')
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const veiculo = await this.veiculoRepository.findById(id);
    if (!veiculo) {
      throw new NotFoundException('Veículo nao encontrado');
    }
    await this.veiculoRepository.delete(id);
  }
}
