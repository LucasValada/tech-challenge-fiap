import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServicoDto, UpdateServicoDto } from './dto';
import { ServicoRepository } from './servico.repository';

@Injectable()
export class ServicoService {
  constructor(private readonly servicoRepository: ServicoRepository) {}

  async create(dto: CreateServicoDto) {
    return this.servicoRepository.create(dto);
  }

  async findAll() {
    return this.servicoRepository.findAll();
  }

  async findById(id: string) {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundException(`Servico with id ${id} not found`);
    }
    return servico;
  }

  async update(id: string, dto: UpdateServicoDto) {
    await this.findById(id);
    return this.servicoRepository.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.servicoRepository.delete(id);
  }
}
