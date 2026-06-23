import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SERVICO_REPOSITORY,
  ServicoRepository,
} from '../../domain/repository/servico.repository';

@Injectable()
export class FindByIdServicoUseCase {
  constructor(
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
  ) {}

  async execute(id: string) {
    const servico = await this.servicoRepository.findById(id);
    if (!servico) {
      throw new NotFoundException(`Servico with id ${id} not found`);
    }
    return servico;
  }
}
