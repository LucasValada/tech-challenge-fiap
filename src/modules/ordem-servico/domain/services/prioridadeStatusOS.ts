import { StatusOrdemServico } from '../entity/OrdemServico';

/**
 * Ordem da listagem: as OS mais perto de terminar primeiro. AGUARDANDO_PAGAMENTO
 * (Fase 4) fica entre a execução e a aprovação, que é onde ela acontece.
 */
const PRIORIDADE_LISTAGEM: Record<StatusOrdemServico, number> = {
  EM_EXECUCAO: 1,
  AGUARDANDO_PAGAMENTO: 2,
  AGUARDANDO_APROVACAO: 3,
  EM_DIAGNOSTICO: 4,
  RECEBIDA: 5,
  FINALIZADA: 6,
  ENTREGUE: 7,
  CANCELADA: 8,
};

export function prioridadeStatusListagem(status: StatusOrdemServico): number {
  return PRIORIDADE_LISTAGEM[status];
}

/** Fora da listagem de OS em andamento: as encerradas. */
export const STATUS_EXCLUIDOS_DA_LISTAGEM: StatusOrdemServico[] = [
  'FINALIZADA',
  'ENTREGUE',
  'CANCELADA',
];
