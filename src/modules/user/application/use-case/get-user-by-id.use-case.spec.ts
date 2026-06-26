import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetUserByIdUseCase } from './get-user-by-id.use-case';

const USER_ID_EXISTENTE = 'uuid-existente';
const USER_ID_INEXISTENTE = 'uuid-inexistente';

const mockUserRepository = {
  getUserById: jest.fn(),
};

const usuarioMock = {
  id: USER_ID_EXISTENTE,
  nome: 'Admin Teste',
  email: 'usuario.teste@example.com',
  senhaHash: 'fake-hash-for-tests',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GetUserByIdUseCase', () => {
  let useCase: GetUserByIdUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserByIdUseCase,
        { provide: 'USER_REPOSITORY', useValue: mockUserRepository },
      ],
    }).compile();

    useCase = moduleRef.get(GetUserByIdUseCase);
    jest.clearAllMocks();
  });

  it('retorna o usuário quando encontrado', async () => {
    mockUserRepository.getUserById.mockResolvedValue(usuarioMock);

    const result = await useCase.execute(USER_ID_EXISTENTE);

    expect(result).toBe(usuarioMock);
    expect(mockUserRepository.getUserById).toHaveBeenCalledWith(
      USER_ID_EXISTENTE,
    );
  });

  it('lança NotFoundException quando o usuário não existe', async () => {
    mockUserRepository.getUserById.mockResolvedValue(null);

    await expect(useCase.execute(USER_ID_INEXISTENTE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
