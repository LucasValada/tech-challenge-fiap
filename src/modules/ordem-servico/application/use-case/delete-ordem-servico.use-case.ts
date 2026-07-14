import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';

@Injectable()
export class DeleteOrdemServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await buscarOrdemServicoOuFalhar(this.ordemServicoRepository, id);
    await this.ordemServicoRepository.delete(id);
  }
}
