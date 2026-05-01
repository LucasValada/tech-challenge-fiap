import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVeiculoDto, UpdateVeiculoDto } from '../dto';
import {
  VEICULO_REPOSITORY,
  VeiculoRepository,
} from '../../domain/repository/veiculo.repository';

@Injectable()
export class VeiculoService {
  constructor(
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculoRepository: VeiculoRepository,
  ) {}

  async create(dto: CreateVeiculoDto) {
    return this.veiculoRepository.create(dto);
  }

  async findAll() {
    return this.veiculoRepository.findAll();
  }

  async findById(id: string) {
    const veiculo = await this.veiculoRepository.findById(id);
    if (!veiculo) {
      throw new NotFoundException(`Vehicle with id ${id} not found`);
    }
    return veiculo;
  }

  async update(id: string, dto: UpdateVeiculoDto) {
    await this.findById(id);
    return this.veiculoRepository.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.veiculoRepository.delete(id);
  }
}
