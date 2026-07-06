import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { garantirOSMutavel } from '../../domain/services/garantirOSMutavel';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

@Injectable()
export class RemoverServicoOSUseCase {
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
      garantirOSMutavel(ordem.status);
      await this.ordemServicoRepository.removerServico(ordemId, linhaId);
    } catch (e) {
      throw traduzirErroDominio(e);
    }
  }
}
