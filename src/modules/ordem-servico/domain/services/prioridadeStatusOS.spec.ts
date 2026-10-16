import { StatusOrdemServico } from '../entity/OrdemServico';
import {
  STATUS_EXCLUIDOS_DA_LISTAGEM,
  prioridadeStatusListagem,
} from './prioridadeStatusOS';

describe('prioridadeStatusListagem', () => {
  it.each<[StatusOrdemServico, number]>([
    ['EM_EXECUCAO', 1],
    ['AGUARDANDO_PAGAMENTO', 2],
    ['AGUARDANDO_APROVACAO', 3],
    ['EM_DIAGNOSTICO', 4],
    ['RECEBIDA', 5],
  ])('%s deve ter prioridade %d', (status, prioridadeEsperada) => {
    expect(prioridadeStatusListagem(status)).toBe(prioridadeEsperada);
  });

  it('ordenação completa respeita a regra da Fase 2, com AGUARDANDO_PAGAMENTO entre execução e aprovação', () => {
    const statusEmbaralhados: StatusOrdemServico[] = [
      'RECEBIDA',
      'AGUARDANDO_PAGAMENTO',
      'EM_EXECUCAO',
      'AGUARDANDO_APROVACAO',
      'EM_DIAGNOSTICO',
    ];

    const ordenados = [...statusEmbaralhados].sort(
      (a, b) => prioridadeStatusListagem(a) - prioridadeStatusListagem(b),
    );

    expect(ordenados).toEqual([
      'EM_EXECUCAO',
      'AGUARDANDO_PAGAMENTO',
      'AGUARDANDO_APROVACAO',
      'EM_DIAGNOSTICO',
      'RECEBIDA',
    ]);
  });
});

describe('STATUS_EXCLUIDOS_DA_LISTAGEM', () => {
  it('contém exatamente as OS encerradas: FINALIZADA, ENTREGUE e CANCELADA', () => {
    expect(STATUS_EXCLUIDOS_DA_LISTAGEM).toEqual(
      expect.arrayContaining(['FINALIZADA', 'ENTREGUE', 'CANCELADA']),
    );
    expect(STATUS_EXCLUIDOS_DA_LISTAGEM).toHaveLength(3);
  });
});
