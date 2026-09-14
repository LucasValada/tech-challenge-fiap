import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';
import { OSStatusInvalidoParaAprovacaoError } from '../../domain/errors';

/**
 * Decisão do cliente (autenticado por CPF) sobre o orçamento da PRÓPRIA OS.
 * O `clienteId` vem do token emitido pela Lambda (payload.sub); a OS só é
 * decidida se pertencer a esse cliente — caso contrário responde 404, para não
 * revelar a existência de ordens de serviço de terceiros.
 *
 * Aprovar:  AGUARDANDO_APROVACAO → EM_EXECUCAO    (AVANCO)
 * Rejeitar: AGUARDANDO_APROVACAO → EM_DIAGNOSTICO (ROLLBACK)
 */
@Injectable()
export class DecidirOrcamentoClienteUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    clienteId: string,
    ordemId: string,
    aprovado: boolean,
  ): Promise<OrdemServico> {
    const ordem = await this.ordemServicoRepository.findById(ordemId);

    if (!ordem || ordem.clienteId !== clienteId) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    if (ordem.status !== 'AGUARDANDO_APROVACAO') {
      throw new ConflictException(
        new OSStatusInvalidoParaAprovacaoError(ordem.status).message,
      );
    }

    return this.ordemServicoRepository.transicionarStatus(
      ordem.id!,
      aprovado ? 'EM_EXECUCAO' : 'EM_DIAGNOSTICO',
      aprovado ? 'AVANCO' : 'ROLLBACK',
      ordem.usuarioCriadorId,
      aprovado
        ? 'Orçamento aprovado pelo cliente (autenticação por CPF)'
        : 'Orçamento recusado pelo cliente (autenticação por CPF)',
    );
  }
}
