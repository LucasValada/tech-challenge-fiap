import * as bcrypt from 'bcrypt';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';

jest.mock('bcrypt');

describe('BcryptPasswordHasher', () => {
  let hasher: BcryptPasswordHasher;

  beforeEach(() => {
    hasher = new BcryptPasswordHasher();
    jest.clearAllMocks();
  });

  it('delega o compare para o bcrypt com os argumentos recebidos', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const ok = await hasher.compare('senha123', '$2b$10$hashedvalue');

    expect(ok).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith('senha123', '$2b$10$hashedvalue');
  });

  it('retorna false quando o bcrypt rejeita a senha', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const ok = await hasher.compare('errada', '$2b$10$hashedvalue');

    expect(ok).toBe(false);
  });
});
