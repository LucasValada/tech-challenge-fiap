import { Inject, Injectable } from '@nestjs/common';
import { VeiculoRepository } from '../../domain/repository/veiculo.repository';
import { Veiculo } from '../../domain/entity/Veiculo';
import { garantirPlacaUnica } from '../../domain/services/garantirPlacaUnica';

@Injectable()
export class CreateVeiculoUseCase {
  constructor(
    @Inject('VEICULO_REPOSITORY')
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  async execute(data: {
    placa: string;
    marca: string;
    modelo: string;
    ano: number;
    clienteId: string;
  }): Promise<Veiculo> {
    await garantirPlacaUnica(this.veiculoRepository, data.placa);
    return this.veiculoRepository.create(data);
  }
}
