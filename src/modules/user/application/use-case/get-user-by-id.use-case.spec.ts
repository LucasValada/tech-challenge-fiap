import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetUserByIdUseCase } from './get-user-by-id.use-case';

const USER_ID = 'user-uuid';

const usuarioMock = {
  id: USER_ID,
  nome: 'Admin',
  email: 'admin@teste.com',
  senhaHash: '$2a$10$secret',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserRepository = { findById: jest.fn() };

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

  it('retorna UserResponseDto sem senhaHash quando usuário existe', async () => {
    mockUserRepository.findById.mockResolvedValue(usuarioMock);

    const result = await useCase.execute(USER_ID);

    expect(result).not.toHaveProperty('senhaHash');
    expect(result.id).toBe(USER_ID);
    expect(result.email).toBe(usuarioMock.email);
  });

  it('lança NotFoundException quando o usuário não existe', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
