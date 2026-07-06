import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { VeiculoRepository } from '../../domain/repository/veiculo.repository';
import { Veiculo } from '../../domain/entity/Veiculo';

@Injectable()
export class GetVeiculoByIdUseCase {
  constructor(
    @Inject('VEICULO_REPOSITORY')
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  async execute(id: string): Promise<Veiculo> {
    const veiculo = await this.veiculoRepository.findById(id);
    if (!veiculo) {
      throw new NotFoundException('Veículo nao encontrado');
    }
    return veiculo;
  }
}
