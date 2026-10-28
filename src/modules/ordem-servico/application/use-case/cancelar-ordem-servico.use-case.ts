import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../domain/entity/OrdemServico';
import { CancelamentoNaoPermitidoError } from '../../domain/errors';
import { OrdemServicoRepository } from '../../domain/repository/ordem-servico.repository';
import { buscarOrdemServicoOuFalhar } from '../../domain/services/buscarOrdemServicoOuFalhar';
import { cancelarOrcamento } from '../saga/comandos-saga';
import {
  PUBLICADOR_COMANDOS,
  type PublicadorComandos,
} from '../saga/mensagens-saga';
import { traduzirErroDominio } from '../shared/traduzirErroDominio';

/** Status em que a OS espera o cliente e só o funcionário pode cancelá-la. */
export const STATUS_CANCELAVEIS_PELO_FUNCIONARIO: StatusOrdemServico[] = [
  'AGUARDANDO_APROVACAO',
  'AGUARDANDO_PAGAMENTO',
];

/**
 * Cancelamento pelo funcionário de uma OS parada esperando o cliente: ele não
 * aprovou, desistiu ou o QR Code de pagamento expirou — a Saga não encerra a OS
 * sozinha por isso (docs/contratos.md, seção 6).
 *
 * Compensa o que a Saga já fez: devolve o estoque e manda o Billing cancelar o
 * orçamento (que cancela a cobrança e estorna, se o cliente tiver pago no meio). Nos
 * status em que o mecânico atua, a OS é cancelada pela rota `falhar` do
 * Execution.
 */
@Injectable()
export class CancelarOrdemServicoUseCase {
  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly ordemServicoRepository: OrdemServicoRepository,
    @Inject(PUBLICADOR_COMANDOS)
    private readonly publicador: PublicadorComandos,
  ) {}

  async execute(
    ordemId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<OrdemServico> {
    const ordem = await buscarOrdemServicoOuFalhar(
      this.ordemServicoRepository,
      ordemId,
    );
    if (!STATUS_CANCELAVEIS_PELO_FUNCIONARIO.includes(ordem.status)) {
      throw new ConflictException(
        new CancelamentoNaoPermitidoError(ordem.status).message,
      );
    }

    const motivoCompleto = `Cancelada pelo funcionário: ${motivo}`;
    try {
      return await this.ordemServicoRepository.transicionarStatus(
        ordemId,
        'CANCELADA',
        'COMPENSACAO',
        usuarioId,
        motivoCompleto,
        {
          statusEsperados: [ordem.status],
          devolverEstoque: true,
          motivoCancelamento: motivoCompleto,
          antesDoCommit: (gravada) =>
            this.publicador.publicar(cancelarOrcamento(gravada, motivo)),
        },
      );
    } catch (e) {
      throw traduzirErroDominio(e);
    }
  }
}
