import { calcularSubtotal, calcularTotais } from './calcularTotaisOS';

describe('calcularTotaisOS', () => {
  describe('calcularSubtotal', () => {
    it('calcula subtotal simples', () => {
      expect(calcularSubtotal(100, 2)).toBe(200);
    });

    it('arredonda para 2 casas decimais', () => {
      expect(calcularSubtotal(10.333, 3)).toBe(31);
    });

    it('retorna 0 para quantidade 0', () => {
      expect(calcularSubtotal(100, 0)).toBe(0);
    });

    it('retorna 0 para Infinity', () => {
      expect(calcularSubtotal(Infinity, 1)).toBe(0);
    });

    it('retorna 0 para NaN', () => {
      expect(calcularSubtotal(NaN, 1)).toBe(0);
    });
  });

  describe('calcularTotais', () => {
    it('soma serviços e itens separadamente', () => {
      const servicos = [{ subtotal: 100 }, { subtotal: 200.5 }];
      const itens = [{ subtotal: 50.25 }, { subtotal: 30 }];

      const result = calcularTotais(servicos, itens);

      expect(result.valorServicos).toBe(300.5);
      expect(result.valorPecas).toBe(80.25);
      expect(result.valorTotal).toBe(380.75);
    });

    it('retorna zeros para listas vazias', () => {
      const result = calcularTotais([], []);

      expect(result.valorServicos).toBe(0);
      expect(result.valorPecas).toBe(0);
      expect(result.valorTotal).toBe(0);
    });

    it('funciona com apenas serviços', () => {
      const result = calcularTotais([{ subtotal: 150 }], []);

      expect(result.valorServicos).toBe(150);
      expect(result.valorPecas).toBe(0);
      expect(result.valorTotal).toBe(150);
    });

    it('funciona com apenas itens', () => {
      const result = calcularTotais([], [{ subtotal: 75.5 }]);

      expect(result.valorServicos).toBe(0);
      expect(result.valorPecas).toBe(75.5);
      expect(result.valorTotal).toBe(75.5);
    });
  });
});
