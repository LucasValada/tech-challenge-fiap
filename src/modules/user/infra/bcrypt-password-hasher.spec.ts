import * as bcrypt from 'bcrypt';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';

jest.mock('bcrypt');

const PLAIN_INPUT = 'plain-input-a';
const FAKE_HASH = 'fake-hash-for-tests';
const EXPECTED_ROUNDS = 10;

describe('BcryptPasswordHasher', () => {
  let hasher: BcryptPasswordHasher;

  beforeEach(() => {
    hasher = new BcryptPasswordHasher();
    jest.clearAllMocks();
  });

  it('delega o hash para o bcrypt com os rounds configurados', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue(FAKE_HASH);

    const resultado = await hasher.hash(PLAIN_INPUT);

    expect(resultado).toBe(FAKE_HASH);
    expect(bcrypt.hash).toHaveBeenCalledWith(PLAIN_INPUT, EXPECTED_ROUNDS);
  });
});
