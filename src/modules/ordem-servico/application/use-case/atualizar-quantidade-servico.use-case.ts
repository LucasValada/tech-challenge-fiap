import { Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OSServicoLinha } from '../../domain/entity/OSServicoLinha';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { garantirOSMutavel } from '../../domain/services/garantirOSMutavel';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

@Injectable()
export class AtualizarQuantidadeServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    ordemId: string,
    linhaId: string,
    quantidade: number,
  ): Promise<OSServicoLinha> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );
    try {
      garantirOSMutavel(ordem.status);
      return await this.ordemServicoRepository.atualizarQuantidadeServico(
        ordemId,
        linhaId,
        quantidade,
      );
    } catch (e) {
      throw traduzirErroDominio(e);
    }
  }
}
