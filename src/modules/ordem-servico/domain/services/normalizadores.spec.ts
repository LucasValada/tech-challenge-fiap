import { normalizarCpfCnpj, normalizarPlaca } from './normalizadores';

describe('normalizadores', () => {
  describe('normalizarCpfCnpj', () => {
    it('remove pontuação de CPF', () => {
      expect(normalizarCpfCnpj('529.982.247-25')).toBe('52998224725');
    });

    it('remove pontuação de CNPJ', () => {
      expect(normalizarCpfCnpj('11.444.777/0001-61')).toBe('11444777000161');
    });

    it('mantém string já limpa', () => {
      expect(normalizarCpfCnpj('52998224725')).toBe('52998224725');
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
