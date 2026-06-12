import { StatusOrdemServico } from '../entity/OrdemServico';
import {
  STATUS_EXCLUIDOS_DA_LISTAGEM,
  prioridadeStatusListagem,
} from './prioridadeStatusOS';

describe('prioridadeStatusListagem', () => {
  it.each<[StatusOrdemServico, number]>([
    ['EM_EXECUCAO', 1],
    ['AGUARDANDO_APROVACAO', 2],
    ['EM_DIAGNOSTICO', 3],
    ['RECEBIDA', 4],
  ])('%s deve ter prioridade %d', (status, prioridadeEsperada) => {
    expect(prioridadeStatusListagem(status)).toBe(prioridadeEsperada);
  });

  it('ordenação completa respeita a regra da Fase 2', () => {
    const statusEmbaralhados: StatusOrdemServico[] = [
      'RECEBIDA',
      'EM_EXECUCAO',
      'AGUARDANDO_APROVACAO',
      'EM_DIAGNOSTICO',
    ];

    const ordenados = [...statusEmbaralhados].sort(
      (a, b) => prioridadeStatusListagem(a) - prioridadeStatusListagem(b),
    );

    expect(ordenados).toEqual([
      'EM_EXECUCAO',
      'AGUARDANDO_APROVACAO',
      'EM_DIAGNOSTICO',
      'RECEBIDA',
    ]);
  });
});

describe('STATUS_EXCLUIDOS_DA_LISTAGEM', () => {
  it('contém exatamente FINALIZADA e ENTREGUE', () => {
    expect(STATUS_EXCLUIDOS_DA_LISTAGEM).toEqual(
      expect.arrayContaining(['FINALIZADA', 'ENTREGUE']),
    );
    expect(STATUS_EXCLUIDOS_DA_LISTAGEM).toHaveLength(2);
  });
});
