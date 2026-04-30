import { gerarCodigoOSSequencial } from './gerarCodigoOSSequencial';

describe('gerarCodigoOSSequencial', () => {
  it('gera código com ano e contador com padding', () => {
    expect(gerarCodigoOSSequencial(2026, 1)).toBe('OS-2026-000001');
  });

  it('gera código com contador maior', () => {
    expect(gerarCodigoOSSequencial(2026, 12345)).toBe('OS-2026-012345');
  });

  it('gera código com contador de 6 dígitos', () => {
    expect(gerarCodigoOSSequencial(2026, 999999)).toBe('OS-2026-999999');
  });
});
