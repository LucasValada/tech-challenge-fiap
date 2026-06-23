import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteUserUseCase } from './delete-user.use-case';

const USER_ID_EXISTENTE = 'uuid-existente';
const USER_ID_INEXISTENTE = 'uuid-inexistente';

const mockUserRepository = {
  getUserById: jest.fn(),
  deleteUser: jest.fn(),
};

const usuarioBase = {
  id: USER_ID_EXISTENTE,
  nome: 'Admin Teste',
  email: 'usuario.teste@example.com',
  senhaHash: 'fake-hash-for-tests',
  createdAt: new Date(),
  updatedAt: new Date(),
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
    mockUserRepository.getUserById.mockResolvedValue(usuarioBase);
    mockUserRepository.deleteUser.mockResolvedValue(usuarioBase);

    const result = await useCase.execute(USER_ID_EXISTENTE);

    expect(result).toBe(usuarioBase);
    expect(mockUserRepository.deleteUser).toHaveBeenCalledWith(
      USER_ID_EXISTENTE,
    );
  });

  it('lança NotFoundException quando o usuário não existe', async () => {
    mockUserRepository.getUserById.mockResolvedValue(null);

    await expect(useCase.execute(USER_ID_INEXISTENTE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockUserRepository.deleteUser).not.toHaveBeenCalled();
  });
});
