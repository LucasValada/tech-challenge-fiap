import { StatusOrdemServico } from '../../domain/entity/OrdemServico';

export const STATUS_VALUES: StatusOrdemServico[] = [
  'RECEBIDA',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO',
  'EM_EXECUCAO',
  'FINALIZADA',
  'ENTREGUE',
];

export const PLACA_REGEX = /^[A-Za-z]{3}-?\d[A-Za-z\d]\d{2}$/;
