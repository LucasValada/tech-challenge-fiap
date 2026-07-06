import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { OSStatusInvalidoParaAprovacaoError } from '../../domain/errors';
import {
  WebhookOrcamentoDto,
  WebhookOrcamentoResponseDto,
} from '../dto/webhook-orcamento.dto';

@Injectable()
export class ProcessarWebhookOrcamentoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
  ) {}

  async execute(
    dto: WebhookOrcamentoDto,
  ): Promise<WebhookOrcamentoResponseDto> {
    const ordem = await this.ordemServicoRepository.findByCodigo(dto.codigoOS);

    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    if (ordem.status !== 'AGUARDANDO_APROVACAO') {
      throw new ConflictException(
        new OSStatusInvalidoParaAprovacaoError(ordem.status).message,
      );
    }

    const novoStatus = dto.aprovado ? 'EM_EXECUCAO' : 'EM_DIAGNOSTICO';
    const tipoTransicao = dto.aprovado ? 'AVANCO' : 'ROLLBACK';
    const observacao = dto.aprovado
      ? 'Orçamento aprovado via webhook externo'
      : 'Orçamento recusado via webhook externo';

    const ordemAtualizada =
      await this.ordemServicoRepository.transicionarStatus(
        ordem.id!,
        novoStatus,
        tipoTransicao,
        ordem.usuarioCriadorId,
        observacao,
      );

    return {
      codigo: ordemAtualizada.codigo!,
      status: ordemAtualizada.status,
    };
  }
}
