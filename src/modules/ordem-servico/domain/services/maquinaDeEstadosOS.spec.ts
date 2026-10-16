import { StatusOrdemServico } from '../entity/OrdemServico';
import { classificarTransicaoManual } from './maquinaDeEstadosOS';

describe('classificarTransicaoManual', () => {
  it('aceita a entrega: FINALIZADA → ENTREGUE', () => {
    expect(classificarTransicaoManual('FINALIZADA', 'ENTREGUE')).toEqual({
      valida: true,
    });
  });

  it.each<[StatusOrdemServico, StatusOrdemServico]>([
    ['RECEBIDA', 'EM_DIAGNOSTICO'],
    ['EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO'],
    ['AGUARDANDO_APROVACAO', 'EM_EXECUCAO'],
    ['AGUARDANDO_PAGAMENTO', 'EM_EXECUCAO'],
    ['EM_EXECUCAO', 'FINALIZADA'],
    ['FINALIZADA', 'EM_EXECUCAO'],
    ['ENTREGUE', 'FINALIZADA'],
    ['CANCELADA', 'RECEBIDA'],
  ])('recusa %s → %s, que é da Saga ou não existe', (de, para) => {
    const resultado = classificarTransicaoManual(de, para);

    expect(resultado.valida).toBe(false);
    expect(resultado.motivo).toContain('só a entrega');
  });
});
