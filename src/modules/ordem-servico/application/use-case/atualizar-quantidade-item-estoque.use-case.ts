import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OSItemEstoqueLinha } from '../../domain/entity/OSItemEstoqueLinha';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { garantirOSMutavel } from '../../domain/services/garantirOSMutavel';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

@Injectable()
export class AtualizarQuantidadeItemEstoqueUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSItemEstoqueLinha> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );
    try {
      garantirOSMutavel(ordem.status);
      return await this.ordemServicoRepository.atualizarQuantidadeItemEstoque(
        ordemId,
        linhaId,
        quantidade,
      );
    } catch (e) {
      throw traduzirErroDominio(e);
    }
  }
}
