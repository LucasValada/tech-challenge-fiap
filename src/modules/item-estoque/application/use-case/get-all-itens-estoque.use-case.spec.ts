import { Test, TestingModule } from '@nestjs/testing';
import { GetAllItensEstoqueUseCase } from './get-all-itens-estoque.use-case';

const mockRepo = {
  findAll: jest.fn(),
};

describe('GetAllItensEstoqueUseCase', () => {
  let useCase: GetAllItensEstoqueUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllItensEstoqueUseCase,
        { provide: 'ITEM_ESTOQUE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetAllItensEstoqueUseCase);
    jest.clearAllMocks();
  });

  it('delega para o repositório sem filtro quando tipo omitido', async () => {
    const lista = { itemEstoque: [], count: 0 };
    mockRepo.findAll.mockResolvedValue(lista);

    const result = await useCase.execute();

    expect(result).toBe(lista);
    expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
  });

  it('propaga o filtro tipo para o repositório', async () => {
    const lista = { itemEstoque: [], count: 0 };
    mockRepo.findAll.mockResolvedValue(lista);

    await useCase.execute('PECA');

    expect(mockRepo.findAll).toHaveBeenCalledWith('PECA');
  });
});
