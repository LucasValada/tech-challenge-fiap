import { Inject, Injectable } from '@nestjs/common';
import type { Envelope } from '../../../../common/mensageria/envelope';
import { registrarEvento } from '../../../../common/observability';
import type {
  OrdemServico,
  StatusOrdemServico,
} from '../../domain/entity/OrdemServico';
import type {
  OpcoesTransicao,
  OrdemServicoRepository,
  TipoTransicaoOS,
} from '../../domain/repository/ordem-servico.repository';
import {
  estornarPagamento,
  gerarOrcamento,
  iniciarReparo,
} from '../saga/comandos-saga';
import {
  PUBLICADOR_COMANDOS,
  RESPOSTAS,
  type PublicadorComandos,
} from '../saga/mensagens-saga';
import { NotificadorStatusOS } from '../shared/notificador-status-os';

type Tratador = (ordem: OrdemServico, envelope: Envelope) => Promise<void>;

type Ator = 'Billing' | 'Execution';

/**
 * O orquestrador da Saga: recebe as respostas do Billing e do Execution (fila
 * oficina-os-saga-replies) e decide o próximo passo da OS. Cada tratador abaixo
 * é uma linha da tabela de docs/contratos.md, seção 6.
 *
 * Regras comuns a todos:
 *
 * - **Confere o estado antes de agir.** Cada resposta só vale num status. Fora
 *   dele — resposta repetida (o SQS entrega pelo menos uma vez) ou atrasada — é
 *   descartada com um aviso, sem erro. A ordem das mensagens não importa.
 * - **Transição condicional.** A gravação só acontece se a OS ainda estiver no
 *   status lido; se outra ação chegou antes, o erro devolve a mensagem para a
 *   fila e a nova tentativa cai no descarte acima.
 * - **Gravar e publicar juntos.** O próximo comando é publicado dentro da
 *   transação, antes do commit: nada fica gravado sem a mensagem.
 * - **Histórico com o ator real.** As transições usam o criador da OS como
 *   usuário (ADR-001) e dizem na observação quem agiu: Billing ou Execution.
 */
@Injectable()
export class ProcessarRespostaSagaUseCase {
  private readonly tratadores: Record<string, Tratador> = {
    [RESPOSTAS.diagnosticoIniciado]: (o, e) => this.diagnosticoIniciado(o, e),
    [RESPOSTAS.diagnosticoConcluido]: (o, e) => this.diagnosticoConcluido(o, e),
    [RESPOSTAS.orcamentoEnviado]: (o, e) => this.orcamentoEnviado(o, e),
    [RESPOSTAS.geracaoOrcamentoFalhou]: (o, e) =>
      this.geracaoOrcamentoFalhou(o, e),
    [RESPOSTAS.orcamentoAprovado]: (o, e) => this.orcamentoAprovado(o, e),
    [RESPOSTAS.orcamentoRecusado]: (o, e) => this.orcamentoRecusado(o, e),
    [RESPOSTAS.pagamentoConfirmado]: (o, e) => this.pagamentoConfirmado(o, e),
    [RESPOSTAS.pagamentoRecusado]: (o, e) => this.pagamentoRecusado(o, e),
    [RESPOSTAS.reparoConcluido]: (o, e) => this.reparoConcluido(o, e),
    [RESPOSTAS.execucaoFalhou]: (o, e) => this.execucaoFalhou(o, e),
    [RESPOSTAS.pagamentoEstornado]: (o, e) => this.pagamentoEstornado(o, e),
  };

  constructor(
    @Inject('ORDEM_SERVICO_REPOSITORY')
    private readonly repositorio: OrdemServicoRepository,
    @Inject(PUBLICADOR_COMANDOS)
    private readonly publicador: PublicadorComandos,
    private readonly notificador: NotificadorStatusOS,
  ) {}

  async execute(envelope: Envelope): Promise<void> {
    const tratador = this.tratadores[envelope.tipo];
    if (!tratador) {
      registrarEvento(
        'saga.resposta_desconhecida',
        { tipo_mensagem: envelope.tipo },
        'warn',
      );
      return;
    }

    const ordem = await this.repositorio.findById(envelope.osId);
    if (!ordem) {
      registrarEvento(
        'saga.os_desconhecida',
        { tipo_mensagem: envelope.tipo, os_id: envelope.osId },
        'warn',
      );
      return;
    }

    await tratador(ordem, envelope);
  }

  // ─── Diagnóstico (Execution) ───────────────────────────────────────────

  private async diagnosticoIniciado(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['RECEBIDA'])) return;
    await this.transicionar(
      ordem,
      'EM_DIAGNOSTICO',
      'AVANCO',
      'Execution: diagnóstico iniciado pelo mecânico',
    );
  }

  /** Trava as linhas e pede o orçamento ao Billing com a cópia delas. */
  private async diagnosticoConcluido(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['EM_DIAGNOSTICO'])) return;

    const concluiu = await this.repositorio.concluirDiagnostico(
      this.idDa(ordem),
      (snapshot) => this.publicador.publicar(gerarOrcamento(snapshot)),
    );
    if (!concluiu) {
      registrarEvento('saga.resposta_repetida', {
        tipo_mensagem: envelope.tipo,
        os_id: ordem.id,
      });
    }
  }

  // ─── Orçamento (Billing) ───────────────────────────────────────────────

  private async orcamentoEnviado(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['EM_DIAGNOSTICO'])) return;
    const valor = numero(envelope.payload.valorTotal);
    await this.transicionar(
      ordem,
      'AGUARDANDO_APROVACAO',
      'AVANCO',
      'Billing: orçamento enviado ao cliente' +
        (valor === null ? '' : ` (${reais(valor)})`),
    );
  }

  private async geracaoOrcamentoFalhou(
    ordem: OrdemServico,
    envelope: Envelope,
  ) {
    if (!this.noStatus(ordem, envelope, ['EM_DIAGNOSTICO'])) return;
    await this.cancelar(
      ordem,
      'Billing',
      `Falha ao gerar o orçamento: ${texto(envelope.payload.motivo) ?? 'motivo não informado'}`,
    );
  }

  private async orcamentoAprovado(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['AGUARDANDO_APROVACAO'])) return;
    await this.transicionar(
      ordem,
      'AGUARDANDO_PAGAMENTO',
      'AVANCO',
      `Billing: orçamento aprovado ${quemDecidiu(envelope)}`,
    );
  }

  /** O orçamento já está recusado no Billing: aqui só se devolve o estoque. */
  private async orcamentoRecusado(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['AGUARDANDO_APROVACAO'])) return;
    const motivo = texto(envelope.payload.motivo);
    await this.cancelar(
      ordem,
      'Billing',
      `Orçamento recusado ${quemDecidiu(envelope)}${motivo ? `: ${motivo}` : ''}`,
    );
  }

  // ─── Pagamento (Billing) ───────────────────────────────────────────────

  /**
   * Pagamento confirmado: a OS vai para execução e o reparo entra na fila do
   * mecânico. Se a OS já foi cancelada, o pagamento é descartado aqui — o
   * Billing estorna ao processar o CancelarOrcamento.
   */
  private async pagamentoConfirmado(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['AGUARDANDO_PAGAMENTO'])) return;

    // As linhas estão travadas desde o diagnóstico: a leitura fora da
    // transação é a mesma que o reparo vai executar.
    const detalhes = await this.repositorio.findByIdComDetalhes(
      this.idDa(ordem),
    );
    if (!detalhes) {
      throw new Error(`OS ${ordem.id} sumiu entre a leitura e o detalhe`);
    }

    const valor = numero(envelope.payload.valor);
    const dadosDoPagamento = [
      texto(envelope.payload.pagamentoId),
      valor === null ? null : reais(valor),
    ].filter((dado) => dado !== null);
    await this.transicionar(
      ordem,
      'EM_EXECUCAO',
      'AVANCO',
      'Billing: pagamento confirmado no Mercado Pago' +
        (dadosDoPagamento.length ? ` (${dadosDoPagamento.join(', ')})` : ''),
      {
        antesDoCommit: (gravada) =>
          this.publicador.publicar(iniciarReparo(gravada, detalhes)),
      },
    );
  }

  /**
   * Pagamento recusado é informativo (contratos v1.1): o link continua valendo
   * e o cliente pode tentar de novo. Só fica registrado no histórico.
   */
  private async pagamentoRecusado(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['AGUARDANDO_PAGAMENTO'])) return;
    const detalhe = texto(envelope.payload.detalhe) ?? 'sem detalhe';
    await this.repositorio.registrarNoHistorico(
      this.idDa(ordem),
      ordem.usuarioCriadorId,
      `Billing: pagamento recusado (${detalhe}); o cliente pode tentar de novo pelo mesmo link`,
    );
  }

  /** O estorno de uma OS cancelada: só registra no histórico. */
  private async pagamentoEstornado(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['CANCELADA'])) return;
    const pagamentoId = texto(envelope.payload.pagamentoId) ?? 'sem id';
    await this.repositorio.registrarNoHistorico(
      this.idDa(ordem),
      ordem.usuarioCriadorId,
      `Billing: pagamento ${pagamentoId} estornado ao cliente`,
    );
  }

  // ─── Reparo (Execution) ────────────────────────────────────────────────

  private async reparoConcluido(ordem: OrdemServico, envelope: Envelope) {
    if (!this.noStatus(ordem, envelope, ['EM_EXECUCAO'])) return;
    await this.transicionar(
      ordem,
      'FINALIZADA',
      'AVANCO',
      'Execution: reparo concluído',
    );
    await this.notificador.notificar(this.idDa(ordem), 'FINALIZADA');
  }

  /**
   * Falha registrada pelo mecânico (ou comando recusado pelo Execution). No
   * diagnóstico, só o estoque volta; no reparo, a OS já foi paga e o Billing
   * estorna.
   */
  private async execucaoFalhou(ordem: OrdemServico, envelope: Envelope) {
    const etapa = texto(envelope.payload.etapa);
    const motivo = texto(envelope.payload.motivo) ?? 'motivo não informado';

    if (etapa === 'DIAGNOSTICO') {
      if (!this.noStatus(ordem, envelope, ['RECEBIDA', 'EM_DIAGNOSTICO'])) {
        return;
      }
      await this.cancelar(
        ordem,
        'Execution',
        `Falha no diagnóstico: ${motivo}`,
      );
      return;
    }

    if (etapa === 'REPARO') {
      if (!this.noStatus(ordem, envelope, ['EM_EXECUCAO'])) return;
      const motivoCompleto = `Falha no reparo: ${motivo}`;
      await this.cancelar(ordem, 'Execution', motivoCompleto, (gravada) =>
        this.publicador.publicar(estornarPagamento(gravada, motivoCompleto)),
      );
      return;
    }

    registrarEvento(
      'saga.resposta_invalida',
      { tipo_mensagem: envelope.tipo, os_id: ordem.id, etapa },
      'warn',
    );
  }

  // ─── Apoio ─────────────────────────────────────────────────────────────

  /**
   * A resposta só vale nos status esperados. Fora deles é repetida ou chegou
   * tarde: registra o aviso e descarta, sem erro (docs/contratos.md, seção 1).
   */
  private noStatus(
    ordem: OrdemServico,
    envelope: Envelope,
    esperados: StatusOrdemServico[],
  ): boolean {
    if (esperados.includes(ordem.status)) return true;
    registrarEvento(
      'saga.resposta_fora_de_hora',
      {
        tipo_mensagem: envelope.tipo,
        os_id: ordem.id,
        status_atual: ordem.status,
      },
      'warn',
    );
    return false;
  }

  private async transicionar(
    ordem: OrdemServico,
    para: StatusOrdemServico,
    tipo: TipoTransicaoOS,
    observacao: string,
    opcoes: OpcoesTransicao = {},
  ): Promise<void> {
    await this.repositorio.transicionarStatus(
      this.idDa(ordem),
      para,
      tipo,
      ordem.usuarioCriadorId,
      observacao,
      { statusEsperados: [ordem.status], ...opcoes },
    );
  }

  /** Compensação: cancela a OS, devolve o estoque e, se preciso, publica o comando. */
  private cancelar(
    ordem: OrdemServico,
    ator: Ator,
    motivo: string,
    publicar?: (gravada: OrdemServico) => Promise<void>,
  ): Promise<void> {
    return this.transicionar(
      ordem,
      'CANCELADA',
      'COMPENSACAO',
      `${ator}: ${motivo}`,
      {
        devolverEstoque: true,
        motivoCancelamento: motivo,
        antesDoCommit: publicar,
      },
    );
  }

  private idDa(ordem: OrdemServico): string {
    if (!ordem.id) throw new Error('OS lida do banco sem id');
    return ordem.id;
  }
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

const formatoReais = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function reais(valor: number): string {
  return formatoReais.format(valor);
}

function quemDecidiu(envelope: Envelope): string {
  return envelope.payload.origem === 'SISTEMA_EXTERNO'
    ? 'pelo sistema externo'
    : 'pelo cliente';
}
