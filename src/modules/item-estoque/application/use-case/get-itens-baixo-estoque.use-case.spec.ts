import { Test, TestingModule } from '@nestjs/testing';
import { GetItensBaixoEstoqueUseCase } from './get-itens-baixo-estoque.use-case';

const mockRepo = {
  findBaixoEstoque: jest.fn(),
};

describe('GetItensBaixoEstoqueUseCase', () => {
  let useCase: GetItensBaixoEstoqueUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetItensBaixoEstoqueUseCase,
        { provide: 'ITEM_ESTOQUE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetItensBaixoEstoqueUseCase);
    jest.clearAllMocks();
  });

  it('delega para o repositório e retorna itens com baixo estoque', async () => {
    const lista = { itemEstoque: [], count: 0 };
    mockRepo.findBaixoEstoque.mockResolvedValue(lista);

    const result = await useCase.execute();

    expect(result).toBe(lista);
    expect(mockRepo.findBaixoEstoque).toHaveBeenCalled();
  });
});
