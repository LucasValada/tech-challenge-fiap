import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteUserUseCase } from './delete-user.use-case';

const USER_ID = 'user-uuid';

const usuarioMock = {
  id: USER_ID,
  nome: 'Admin',
  email: 'admin@teste.com',
  senhaHash: '$2a$10$secret',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserRepository = {
  findById: jest.fn(),
  delete: jest.fn(),
};

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: 'USER_REPOSITORY', useValue: mockUserRepository },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteUserUseCase);
    jest.clearAllMocks();
  });

  it('deleta o usuário quando existe', async () => {
    mockUserRepository.findById.mockResolvedValue(usuarioMock);
    mockUserRepository.delete.mockResolvedValue(usuarioMock);

    await useCase.execute(USER_ID);

    expect(mockUserRepository.delete).toHaveBeenCalledWith(USER_ID);
  });

  it('lança NotFoundException quando o usuário não existe', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockUserRepository.delete).not.toHaveBeenCalled();
  });
});
