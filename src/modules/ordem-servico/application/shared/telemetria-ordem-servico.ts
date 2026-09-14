import {
  incrementarMetrica,
  notificarErro,
  registrarEvento,
  registrarFalha,
  registrarMetrica,
} from '../../../../common/observability';
import { StatusOrdemServico } from '../../domain/entity/OrdemServico';

/**
 * Telemetria de negócio da ordem de serviço.
 *
 * Cada acontecimento sai por dois canais, com papéis diferentes:
 *
 *   métrica customizada (APM)  →  painéis e alertas. Agregada no processo e
 *                                  enviada a cada 60s: barata, e não depende do
 *                                  pipeline de log para chegar.
 *   evento no log (JSON)       →  investigação. Carrega ordem_id, trace.id e
 *                                  correlationId — o "qual" que a métrica, por
 *                                  ser agregada, não tem como responder.
 *
 * Emitir os dois no mesmo lugar é o que garante que o número do painel e as
 * linhas de log que o explicam contem a mesma história.
 *
 * Os nomes abaixo são contrato com os dashboards e alertas de tc3-infra-k8s
 * (newrelic-dashboard.tf / newrelic-alertas.tf). O agente prefixa `Custom/`:
 * no New Relic eles aparecem como `Custom/OrdemServico/...`.
 *
 * Cardinalidade controlada: o único segmento variável é o status (6 valores do
 * enum) ou a etapa (2 valores). ID de ordem nunca entra em nome de métrica —
 * cada ordem viraria uma série nova.
 */
export const METRICAS_ORDEM_SERVICO = {
  criada: 'OrdemServico/Criada',
  tempoNoStatus: (status: StatusOrdemServico) =>
    `OrdemServico/TempoNoStatus/${status}`,
  transicao: (statusNovo: StatusOrdemServico) =>
    `OrdemServico/Transicao/${statusNovo}`,
  tempoAteEntrega: 'OrdemServico/TempoAteEntrega',
  falha: (etapa: EtapaOrdemServico) => `OrdemServico/Falha/${etapa}`,
} as const;

export type EtapaOrdemServico = 'criacao' | 'transicao_status';

export interface OrdemCriada {
  ordemId?: string;
  codigo?: string;
  clienteId: string;
  veiculoId: string;
  quantidadeServicos: number;
  quantidadeItens: number;
}

/**
 * Sem CPF nem placa: o log sai do cluster para um serviço externo, e nenhuma
 * pergunta do dashboard exige dado pessoal para ser respondida.
 */
export function registrarOrdemCriada(ordem: OrdemCriada): void {
  incrementarMetrica(METRICAS_ORDEM_SERVICO.criada);

  registrarEvento('ordem_servico.criada', {
    ordem_id: ordem.ordemId,
    codigo: ordem.codigo,
    cliente_id: ordem.clienteId,
    veiculo_id: ordem.veiculoId,
    quantidade_servicos: ordem.quantidadeServicos,
    quantidade_itens: ordem.quantidadeItens,
  });
}

export interface TransicaoDeStatus {
  ordemId: string;
  codigo?: string;
  /** Ausente só em ordens anteriores ao histórico de status. */
  statusAnterior?: StatusOrdemServico;
  statusNovo: StatusOrdemServico;
  tipoTransicao: 'AVANCO' | 'ROLLBACK';
  usuarioId: string;
  /** Tempo que a ordem passou em `statusAnterior`. */
  segundosNoStatus?: number;
  /** Tempo desde a abertura da ordem até esta transição. */
  segundosDesdeAbertura?: number;
}

/**
 * "Tempo de execução por status": quanto a ordem ficou em cada etapa.
 *
 * A métrica é indexada pelo status de ONDE a ordem saiu — é esse o status cuja
 * duração acabou de ser conhecida. Uma ordem que vai de EM_DIAGNOSTICO para
 * AGUARDANDO_APROVACAO registra quanto tempo passou em diagnóstico.
 */
export function registrarTransicaoDeStatus(transicao: TransicaoDeStatus): void {
  incrementarMetrica(METRICAS_ORDEM_SERVICO.transicao(transicao.statusNovo));

  if (transicao.statusAnterior && transicao.segundosNoStatus !== undefined) {
    registrarMetrica(
      METRICAS_ORDEM_SERVICO.tempoNoStatus(transicao.statusAnterior),
      transicao.segundosNoStatus,
    );
  }

  // Lead time ponta a ponta. Só no avanço para ENTREGUE: um rollback de
  // ENTREGUE para FINALIZADA não encerra a ordem.
  if (
    transicao.statusNovo === 'ENTREGUE' &&
    transicao.tipoTransicao === 'AVANCO' &&
    transicao.segundosDesdeAbertura !== undefined
  ) {
    registrarMetrica(
      METRICAS_ORDEM_SERVICO.tempoAteEntrega,
      transicao.segundosDesdeAbertura,
    );
  }

  registrarEvento('ordem_servico.status_alterado', {
    ordem_id: transicao.ordemId,
    codigo: transicao.codigo,
    status_anterior: transicao.statusAnterior,
    status_novo: transicao.statusNovo,
    tipo_transicao: transicao.tipoTransicao,
    usuario_id: transicao.usuarioId,
    duracao_status_segundos: transicao.segundosNoStatus,
    duracao_total_segundos: transicao.segundosDesdeAbertura,
  });
}

/**
 * Falha de processamento: defeito do sistema (banco fora, bug), nunca regra de
 * negócio. Estoque insuficiente ou cliente sem cadastro devolvem 4xx e passam
 * por `registrarRejeicaoOrdemServico` — misturar os dois é o que faz um alerta
 * perder credibilidade.
 *
 * O erro também vai para o Errors Inbox do APM, com a etapa como atributo. O
 * filtro global, ao receber a mesma instância, não a registra de novo: o agente
 * descarta a segunda notificação do mesmo objeto na mesma transação.
 */
export function registrarFalhaOrdemServico(
  etapa: EtapaOrdemServico,
  erro: unknown,
  dados: Record<string, string | number | boolean | undefined> = {},
): void {
  incrementarMetrica(METRICAS_ORDEM_SERVICO.falha(etapa));

  notificarErro(erro, {
    'ordemServico.etapa': etapa,
    ...semIndefinidos(dados),
  });

  registrarFalha(`ordem_servico.${etapa}_falhou`, erro, dados);
}

/** Regra de negócio recusou a operação. Fica só no log, em `warn`. */
export function registrarRejeicaoOrdemServico(
  etapa: EtapaOrdemServico,
  motivo: unknown,
  dados: Record<string, unknown> = {},
): void {
  registrarEvento(
    `ordem_servico.${etapa}_rejeitada`,
    {
      motivo: motivo instanceof Error ? motivo.name : String(motivo),
      ...dados,
    },
    'warn',
  );
}

function semIndefinidos(
  dados: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(dados).filter(([, valor]) => valor !== undefined),
  ) as Record<string, string | number | boolean>;
}

export function segundosEntre(
  inicio: Date | undefined | null,
  fim: Date | undefined | null,
): number | undefined {
  if (!inicio || !fim) return undefined;

  const decorrido = new Date(fim).getTime() - new Date(inicio).getTime();

  return decorrido >= 0 ? Math.round(decorrido / 1000) : undefined;
}
