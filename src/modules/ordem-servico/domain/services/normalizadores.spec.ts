import { normalizarCpfCnpj, normalizarPlaca } from './normalizadores';

describe('normalizadores', () => {
  describe('normalizarCpfCnpj', () => {
    it('remove pontuação de CPF', () => {
      expect(normalizarCpfCnpj('123.456.789-00')).toBe('12345678900');
    });

    it('remove pontuação de CNPJ', () => {
      expect(normalizarCpfCnpj('12.345.678/0001-90')).toBe('12345678000190');
    });

    it('mantém string já limpa', () => {
      expect(normalizarCpfCnpj('12345678900')).toBe('12345678900');
    });
  });

  describe('normalizarPlaca', () => {
    it('converte para maiúscula e remove espaços', () => {
      expect(normalizarPlaca(' abc1d23 ')).toBe('ABC1D23');
    });

    it('mantém placa já normalizada', () => {
      expect(normalizarPlaca('ABC1234')).toBe('ABC1234');
    });
  });
});
