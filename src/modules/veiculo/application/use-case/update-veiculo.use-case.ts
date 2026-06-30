import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { VeiculoRepository } from '../../domain/repository/veiculo.repository';
import { Veiculo } from '../../domain/entity/Veiculo';
import { garantirPlacaUnica } from '../../domain/services/garantirPlacaUnica';

@Injectable()
export class UpdateVeiculoUseCase {
  constructor(
    @Inject('VEICULO_REPOSITORY')
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  async execute(
    id: string,
    data: {
      placa?: string;
      marca?: string;
      modelo?: string;
      ano?: number;
    },
  ): Promise<Veiculo> {
    const veiculo = await this.veiculoRepository.findById(id);
    if (!veiculo) {
      throw new NotFoundException('Veículo nao encontrado');
    }

    if (data.placa) {
      await garantirPlacaUnica(this.veiculoRepository, data.placa, id);
    }

    return this.veiculoRepository.update(id, data);
  }
}
