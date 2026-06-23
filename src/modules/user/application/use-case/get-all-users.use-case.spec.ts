import { Test, TestingModule } from '@nestjs/testing';
import { GetAllUsersUseCase } from './get-all-users.use-case';

const mockUserRepository = {
  getAllUser: jest.fn(),
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

  it('delega para o repositório e retorna a lista', async () => {
    const resultado = { user: [], count: 0 };
    mockUserRepository.getAllUser.mockResolvedValue(resultado);

    const result = await useCase.execute();

    expect(result).toBe(resultado);
    expect(mockUserRepository.getAllUser).toHaveBeenCalled();
  });
});
