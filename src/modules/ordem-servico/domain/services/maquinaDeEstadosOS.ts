import { StatusOrdemServico } from '../entity/OrdemServico';

export interface ResultadoTransicao {
  valida: boolean;
  motivo?: string;
}

/**
 * Na Fase 4 as transições da OS são disparadas pela Saga, a partir das
 * respostas do Billing e do Execution (ProcessarRespostaSagaUseCase, com a
 * tabela de docs/contratos.md, seção 6). Pela rota de transição só sobra o que
 * nenhum outro serviço sabe: a entrega do veículo ao cliente.
 */
const TRANSICOES_MANUAIS: Partial<
  Record<StatusOrdemServico, StatusOrdemServico>
> = {
  FINALIZADA: 'ENTREGUE',
};

export function classificarTransicaoManual(
  de: StatusOrdemServico,
  para: StatusOrdemServico,
): ResultadoTransicao {
  if (TRANSICOES_MANUAIS[de] === para) return { valida: true };

  return {
    valida: false,
    motivo:
      `Transição ${de} → ${para} não é feita pela API: só a entrega ` +
      '(FINALIZADA → ENTREGUE) é manual; as demais vêm da Saga',
  };
}
