import { OrdemServico, StatusOrdemServico } from '../entity/OrdemServico';
import { LinhasTravadasError, OSImutavelError } from '../errors';
import {
  garantirLinhasEditaveis,
  STATUS_COM_LINHAS_EDITAVEIS,
} from './garantirLinhasEditaveis';

function ordem(
  status: StatusOrdemServico,
  diagnosticoConcluidoAt: Date | null = null,
): OrdemServico {
  const os = new OrdemServico('c', 'v', 'u', status, null, 0, 0, 0);
  os.diagnosticoConcluidoAt = diagnosticoConcluidoAt;
  return os;
}

describe('garantirLinhasEditaveis', () => {
  it.each(STATUS_COM_LINHAS_EDITAVEIS)(
    'aceita editar linhas em %s antes da conclusão do diagnóstico',
    (status) => {
      expect(() => garantirLinhasEditaveis(ordem(status))).not.toThrow();
    },
  );

  it('recusa depois da conclusão do diagnóstico, mesmo ainda em EM_DIAGNOSTICO', () => {
    expect(() =>
      garantirLinhasEditaveis(ordem('EM_DIAGNOSTICO', new Date())),
    ).toThrow(LinhasTravadasError);
  });

  it.each<StatusOrdemServico>([
    'AGUARDANDO_APROVACAO',
    'AGUARDANDO_PAGAMENTO',
    'EM_EXECUCAO',
    'FINALIZADA',
    'ENTREGUE',
    'CANCELADA',
  ])('recusa em %s', (status) => {
    expect(() => garantirLinhasEditaveis(ordem(status))).toThrow(
      OSImutavelError,
    );
  });
});
