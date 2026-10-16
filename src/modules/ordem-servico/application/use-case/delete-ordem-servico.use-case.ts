import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OSNaoCanceladaError } from '../../domain/errors';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';

/**
 * Exclui uma OS. Só uma OS CANCELADA pode sair: no meio da Saga, a exclusão
 * deixaria orçamento, pagamento e tarefas órfãos no Billing e no Execution
 * (docs/contratos.md, seção 7). O estoque de uma OS cancelada já foi devolvido
 * na compensação.
 */
@Injectable()
export class DeleteOrdemServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      id,
    );
    if (ordem.status !== 'CANCELADA') {
      throw new ConflictException(
        new OSNaoCanceladaError(ordem.status).message,
      );
    }
    await this.ordemServicoRepository.delete(id);
  }
}
