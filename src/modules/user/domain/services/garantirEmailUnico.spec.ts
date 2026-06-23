import { ConflictException } from '@nestjs/common';
import { garantirEmailUnico } from './garantirEmailUnico';

const EMAIL_NOVO = 'novo@example.com';
const EMAIL_EXISTENTE = 'existente@example.com';
const EMAIL_DO_USUARIO = 'usuario@example.com';
const USUARIO_ID = 'uuid-1';

const mockUserRepo = {
  getAllUser: jest.fn(),
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

describe('garantirEmailUnico', () => {
  beforeEach(() => jest.clearAllMocks());

  it('não lança quando email não existe', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null);

    await expect(
      garantirEmailUnico(mockUserRepo, EMAIL_NOVO),
    ).resolves.toBeUndefined();
    expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith(
      EMAIL_NOVO,
      undefined,
    );
  });

  it('lança ConflictException quando email já existe', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue({ id: 'outro' });

    await expect(
      garantirEmailUnico(mockUserRepo, EMAIL_EXISTENTE),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('passa excludeId para o repositório no update', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null);

    await garantirEmailUnico(mockUserRepo, EMAIL_DO_USUARIO, USUARIO_ID);

    expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith(
      EMAIL_DO_USUARIO,
      USUARIO_ID,
    );
  });
});
