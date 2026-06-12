import { StatusOrdemServico } from '../entity/OrdemServico';
import {
  STATUS_EXCLUIDOS_DA_LISTAGEM,
  prioridadeStatusListagem,
} from './prioridadeStatusOS';

describe('prioridadeStatusListagem', () => {
  it('EM_EXECUCAO tem maior prioridade (1)', () => {
    expect(prioridadeStatusListagem('EM_EXECUCAO')).toBe(1);
  });

  it('AGUARDANDO_APROVACAO vem depois de EM_EXECUCAO', () => {
    expect(prioridadeStatusListagem('AGUARDANDO_APROVACAO')).toBe(2);
  });

  it('EM_DIAGNOSTICO vem depois de AGUARDANDO_APROVACAO', () => {
    expect(prioridadeStatusListagem('EM_DIAGNOSTICO')).toBe(3);
  });

  it('RECEBIDA tem menor prioridade entre os ativos', () => {
    expect(prioridadeStatusListagem('RECEBIDA')).toBe(4);
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
  it('contém FINALIZADA e ENTREGUE', () => {
    expect(STATUS_EXCLUIDOS_DA_LISTAGEM).toEqual(
      expect.arrayContaining(['FINALIZADA', 'ENTREGUE']),
    );
    expect(STATUS_EXCLUIDOS_DA_LISTAGEM).toHaveLength(2);
  });
});
