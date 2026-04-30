import { generateRandomPassword } from './generateRandomPassword';

describe('generateRandomPassword', () => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  it('gera senha com tamanho padrão (8)', () => {
    const senha = generateRandomPassword();
    expect(senha).toHaveLength(8);
  });

  it('gera senha com tamanho customizado', () => {
    expect(generateRandomPassword(12)).toHaveLength(12);
    expect(generateRandomPassword(1)).toHaveLength(1);
  });

  it('usa apenas caracteres alfanuméricos', () => {
    const senha = generateRandomPassword(100);
    for (const c of senha) {
      expect(chars).toContain(c);
    }
  });
});
