import { ConflictException } from '@nestjs/common';
import { garantirEmailUnico } from './garantirEmailUnico';

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
      garantirEmailUnico(mockUserRepo, 'novo@email.com'),
    ).resolves.toBeUndefined();
    expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith(
      'novo@email.com',
      undefined,
    );
  });

  it('lança ConflictException quando email já existe', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue({ id: 'outro' });

    await expect(
      garantirEmailUnico(mockUserRepo, 'existente@email.com'),
    ).rejects.toThrow(ConflictException);
  });

  it('passa excludeId para o repositório no update', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null);

    await garantirEmailUnico(mockUserRepo, 'user@email.com', 'uuid-1');

    expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith(
      'user@email.com',
      'uuid-1',
    );
  });
});
