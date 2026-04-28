import { StatusOrdemServico } from '../entity/OrdemServico';
import { OSImutavelError } from '../errors';

export const STATUS_MUTAVEIS: StatusOrdemServico[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
];

export function garantirOSMutavel(status: StatusOrdemServico): void {
  if (!STATUS_MUTAVEIS.includes(status)) {
    throw new OSImutavelError(status);
  }
}
