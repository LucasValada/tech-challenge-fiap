import { StatusOrdemServico } from '../entity/OrdemServico';

const PRIORIDADE_LISTAGEM: Record<StatusOrdemServico, number> = {
  EM_EXECUCAO: 1,
  AGUARDANDO_APROVACAO: 2,
  EM_DIAGNOSTICO: 3,
  RECEBIDA: 4,
  FINALIZADA: 5,
  ENTREGUE: 6,
};

export function prioridadeStatusListagem(status: StatusOrdemServico): number {
  return PRIORIDADE_LISTAGEM[status];
}

export const STATUS_EXCLUIDOS_DA_LISTAGEM: StatusOrdemServico[] = [
  'FINALIZADA',
  'ENTREGUE',
];
