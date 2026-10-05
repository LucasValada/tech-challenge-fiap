import { Servico } from './Servico';

describe('Servico', () => {
  it('mantém os dados informados', () => {
    const criadoEm = new Date('2026-10-01T10:00:00Z');
    const servico = new Servico(
      's1',
      'Troca de óleo',
      null,
      150,
      30,
      true,
      criadoEm,
      criadoEm,
    );

    expect(servico).toMatchObject({
      id: 's1',
      nome: 'Troca de óleo',
      descricao: null,
      precoBase: 150,
      tempoEstimadoMin: 30,
      ativo: true,
      createdAt: criadoEm,
      updatedAt: criadoEm,
    });
  });
});
