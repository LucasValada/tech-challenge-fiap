import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { garantirLinhasEditaveis } from '../../domain/services/garantirLinhasEditaveis';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

@Injectable()
export class RemoverItemEstoqueOSUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(ordemId: string, linhaId: string): Promise<void> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );
    try {
      garantirLinhasEditaveis(ordem);
      await this.ordemServicoRepository.removerItemEstoque(ordemId, linhaId);
    } catch (e) {
      throw traduzirErroDominio(e);
    }
  }
}
