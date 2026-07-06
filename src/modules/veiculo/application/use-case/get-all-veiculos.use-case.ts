import { Inject, Injectable } from '@nestjs/common';
import { VeiculoRepository } from '../../domain/repository/veiculo.repository';
import { Veiculo } from '../../domain/entity/Veiculo';

@Injectable()
export class GetAllVeiculosUseCase {
  constructor(
    @Inject('VEICULO_REPOSITORY')
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  execute(): Promise<{ veiculo: Veiculo[]; count: number }> {
    return this.veiculoRepository.findAll();
  }
}
