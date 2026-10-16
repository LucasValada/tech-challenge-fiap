import type { Envelope } from '../../../../common/mensageria/envelope';

/**
 * Nomes das mensagens da Saga (docs/contratos.md, seção 5). Comando no
 * imperativo, publicado pelo OS; resposta no particípio, publicada pelo
 * Billing ou pelo Execution na fila oficina-os-saga-replies.
 */
export const COMANDOS = {
  iniciarDiagnostico: 'IniciarDiagnostico',
  iniciarReparo: 'IniciarReparo',
  gerarOrcamento: 'GerarOrcamento',
  cancelarOrcamento: 'CancelarOrcamento',
  estornarPagamento: 'EstornarPagamento',
} as const;

export type Comando = (typeof COMANDOS)[keyof typeof COMANDOS];

export const RESPOSTAS = {
  diagnosticoIniciado: 'DiagnosticoIniciado',
  diagnosticoConcluido: 'DiagnosticoConcluido',
  orcamentoEnviado: 'OrcamentoEnviado',
  geracaoOrcamentoFalhou: 'GeracaoOrcamentoFalhou',
  orcamentoAprovado: 'OrcamentoAprovado',
  orcamentoRecusado: 'OrcamentoRecusado',
  pagamentoConfirmado: 'PagamentoConfirmado',
  pagamentoRecusado: 'PagamentoRecusado',
  pagamentoEstornado: 'PagamentoEstornado',
  reparoConcluido: 'ReparoConcluido',
  execucaoFalhou: 'ExecucaoFalhou',
} as const;

export const PUBLICADOR_COMANDOS = Symbol('PUBLICADOR_COMANDOS');

/**
 * Publica os comandos da Saga. A implementação escolhe a fila pelo tipo:
 * diagnóstico e reparo vão para o Execution; orçamento, cancelamento e
 * estorno, para o Billing.
 */
export interface PublicadorComandos {
  publicar(envelope: Envelope<unknown>): Promise<void>;
}
