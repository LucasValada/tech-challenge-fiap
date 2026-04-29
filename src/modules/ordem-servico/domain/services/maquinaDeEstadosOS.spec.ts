import {
  classificarTransicao,
  ehStatusTerminal,
} from './maquinaDeEstadosOS';
import { StatusOrdemServico } from '../entity/OrdemServico';

describe('maquinaDeEstadosOS', () => {
  describe('classificarTransicao', () => {
    const avancosValidos: [StatusOrdemServico, StatusOrdemServico][] = [
      ['RECEBIDA', 'EM_DIAGNOSTICO'],
      ['EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO'],
      ['AGUARDANDO_APROVACAO', 'EM_EXECUCAO'],
      ['EM_EXECUCAO', 'FINALIZADA'],
      ['FINALIZADA', 'ENTREGUE'],
    ];

    it.each(avancosValidos)(
      'aceita avanço %s → %s',
      (de, para) => {
        const result = classificarTransicao(de, para);
        expect(result.valida).toBe(true);
        expect(result.tipo).toBe('AVANCO');
      },
    );

    const rollbacksValidos: [StatusOrdemServico, StatusOrdemServico][] = [
      ['EM_DIAGNOSTICO', 'RECEBIDA'],
      ['AGUARDANDO_APROVACAO', 'EM_DIAGNOSTICO'],
      ['EM_EXECUCAO', 'AGUARDANDO_APROVACAO'],
      ['FINALIZADA', 'EM_EXECUCAO'],
    ];

    it.each(rollbacksValidos)(
      'aceita rollback %s → %s',
      (de, para) => {
        const result = classificarTransicao(de, para);
        expect(result.valida).toBe(true);
        expect(result.tipo).toBe('ROLLBACK');
      },
    );

    it('rejeita transição para o mesmo status', () => {
      const result = classificarTransicao('RECEBIDA', 'RECEBIDA');
      expect(result.valida).toBe(false);
      expect(result.motivo).toContain('já está no status');
    });

    it('rejeita pulo de etapa (RECEBIDA → FINALIZADA)', () => {
      const result = classificarTransicao('RECEBIDA', 'FINALIZADA');
      expect(result.valida).toBe(false);
      expect(result.motivo).toContain('não permitida');
    });

    it('rejeita avanço a partir de ENTREGUE', () => {
      const result = classificarTransicao('ENTREGUE', 'RECEBIDA');
      expect(result.valida).toBe(false);
    });

    it('rejeita rollback de RECEBIDA', () => {
      const result = classificarTransicao('RECEBIDA', 'ENTREGUE');
      expect(result.valida).toBe(false);
    });

    it('rejeita rollback de ENTREGUE', () => {
      const result = classificarTransicao('ENTREGUE', 'FINALIZADA');
      expect(result.valida).toBe(false);
    });
  });

  describe('ehStatusTerminal', () => {
    it('ENTREGUE é terminal', () => {
      expect(ehStatusTerminal('ENTREGUE')).toBe(true);
    });

    it('RECEBIDA não é terminal (tem avanço)', () => {
      expect(ehStatusTerminal('RECEBIDA')).toBe(false);
    });

    it('EM_EXECUCAO não é terminal', () => {
      expect(ehStatusTerminal('EM_EXECUCAO')).toBe(false);
    });

    it('FINALIZADA não é terminal (tem avanço e rollback)', () => {
      expect(ehStatusTerminal('FINALIZADA')).toBe(false);
    });
  });
});
