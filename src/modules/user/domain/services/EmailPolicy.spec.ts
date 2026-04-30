import { ConflictException } from '@nestjs/common';
import { EmailPolicyService } from './EmailPolicy';

const mockUserRepo = {
  getAllUser: jest.fn(),
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

describe('EmailPolicyService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('não lança erro quando email não existe', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null);

    const policy = new EmailPolicyService(mockUserRepo, 'novo@email.com');

    await expect(policy.IsDuplicate()).resolves.toBeUndefined();
    expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith(
      'novo@email.com',
      undefined,
    );
  });

  it('lança ConflictException quando email já existe', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue({ id: 'outro' });

    const policy = new EmailPolicyService(mockUserRepo, 'existente@email.com');

    await expect(policy.IsDuplicate()).rejects.toThrow(ConflictException);
  });

  it('passa excludeId para o repositório no update', async () => {
    mockUserRepo.getUserByEmail.mockResolvedValue(null);

    const policy = new EmailPolicyService(mockUserRepo, 'user@email.com');
    await policy.IsDuplicate('uuid-1');

    expect(mockUserRepo.getUserByEmail).toHaveBeenCalledWith(
      'user@email.com',
      'uuid-1',
    );
  });
});
