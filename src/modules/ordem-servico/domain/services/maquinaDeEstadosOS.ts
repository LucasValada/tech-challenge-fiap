import { StatusOrdemServico } from '../entity/OrdemServico';

export type TipoTransicao = 'AVANCO' | 'ROLLBACK';

export interface ResultadoTransicao {
  valida: boolean;
  tipo?: TipoTransicao;
  motivo?: string;
}

const AVANCOS: Record<StatusOrdemServico, StatusOrdemServico | null> = {
  RECEBIDA: 'EM_DIAGNOSTICO',
  EM_DIAGNOSTICO: 'AGUARDANDO_APROVACAO',
  AGUARDANDO_APROVACAO: 'EM_EXECUCAO',
  EM_EXECUCAO: 'FINALIZADA',
  FINALIZADA: 'ENTREGUE',
  ENTREGUE: null,
};

const ROLLBACKS: Record<StatusOrdemServico, StatusOrdemServico | null> = {
  RECEBIDA: null,
  EM_DIAGNOSTICO: 'RECEBIDA',
  AGUARDANDO_APROVACAO: 'EM_DIAGNOSTICO',
  EM_EXECUCAO: 'AGUARDANDO_APROVACAO',
  FINALIZADA: 'EM_EXECUCAO',
  ENTREGUE: null,
};

export function classificarTransicao(
  de: StatusOrdemServico,
  para: StatusOrdemServico,
): ResultadoTransicao {
  if (de === para) {
    return {
      valida: false,
      motivo: `Transição já está no status ${de}`,
    };
  }

  if (AVANCOS[de] === para) {
    return { valida: true, tipo: 'AVANCO' };
  }

  if (ROLLBACKS[de] === para) {
    return { valida: true, tipo: 'ROLLBACK' };
  }

  return {
    valida: false,
    motivo: `Transição ${de} → ${para} não permitida`,
  };
}

export function ehStatusTerminal(status: StatusOrdemServico): boolean {
  return AVANCOS[status] === null && ROLLBACKS[status] === null;
}
