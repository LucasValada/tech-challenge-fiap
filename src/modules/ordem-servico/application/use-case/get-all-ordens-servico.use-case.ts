import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';

@Injectable()
export class GetAllOrdensServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(): Promise<{ ordens: OrdemServico[]; count: number }> {
    return this.ordemServicoRepository.findAll();
  }
}
