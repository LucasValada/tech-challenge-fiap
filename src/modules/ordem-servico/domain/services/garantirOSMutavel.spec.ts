import { garantirOSMutavel, STATUS_MUTAVEIS } from './garantirOSMutavel';
import { OSImutavelError } from '../errors';
import { StatusOrdemServico } from '../entity/OrdemServico';

describe('garantirOSMutavel', () => {
  it.each(STATUS_MUTAVEIS)('não lança erro para status mutável %s', (status) => {
    expect(() => garantirOSMutavel(status)).not.toThrow();
  });

  const statusImutaveis: StatusOrdemServico[] = [
    'EM_EXECUCAO',
    'FINALIZADA',
    'ENTREGUE',
  ];

  it.each(statusImutaveis)('lança OSImutavelError para status %s', (status) => {
    expect(() => garantirOSMutavel(status)).toThrow(OSImutavelError);
  });
});
