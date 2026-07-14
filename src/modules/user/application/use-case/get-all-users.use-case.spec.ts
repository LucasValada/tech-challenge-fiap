import { Test, TestingModule } from '@nestjs/testing';
import { GetAllUsersUseCase } from './get-all-users.use-case';

const mockUserRepository = {
  findAll: jest.fn(),
};

describe('GetAllUsersUseCase', () => {
  let useCase: GetAllUsersUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllUsersUseCase,
        { provide: 'USER_REPOSITORY', useValue: mockUserRepository },
      ],
    }).compile();

    useCase = moduleRef.get(GetAllUsersUseCase);
    jest.clearAllMocks();
  });

  it('mapeia usuários para UserResponseDto omitindo senhaHash', async () => {
    const now = new Date();
    mockUserRepository.findAll.mockResolvedValue({
      user: [
        {
          id: 'u1',
          nome: 'Admin',
          email: 'admin@teste.com',
          senhaHash: '$2a$10$secret',
          createdAt: now,
          updatedAt: now,
        },
      ],
      count: 1,
    });

    const result = await useCase.execute();

    expect(result.count).toBe(1);
    expect(result.user[0]).not.toHaveProperty('senhaHash');
    expect(result.user[0]).toEqual({
      id: 'u1',
      nome: 'Admin',
      email: 'admin@teste.com',
      createdAt: now,
      updatedAt: now,
    });
  });
});
