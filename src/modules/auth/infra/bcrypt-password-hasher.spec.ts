import * as bcrypt from 'bcrypt';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';

jest.mock('bcrypt');

const PLAIN_INPUT_A = 'plain-input-a';
const PLAIN_INPUT_B = 'plain-input-b';
const FAKE_HASH = 'fake-hash-for-tests';

describe('BcryptPasswordHasher', () => {
  let hasher: BcryptPasswordHasher;

  beforeEach(() => {
    hasher = new BcryptPasswordHasher();
    jest.clearAllMocks();
  });

  it('delega o compare para o bcrypt com os argumentos recebidos', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const ok = await hasher.compare(PLAIN_INPUT_A, FAKE_HASH);

    expect(ok).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith(PLAIN_INPUT_A, FAKE_HASH);
  });

  it('retorna false quando o bcrypt rejeita a comparação', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const ok = await hasher.compare(PLAIN_INPUT_B, FAKE_HASH);

    expect(ok).toBe(false);
  });
});
