import { Test, TestingModule } from '@nestjs/testing';
import { GetAllOrdensServicoUseCase } from './get-all-ordens-servico.use-case';

const mockOrdemRepo = { findAll: jest.fn() };

describe('GetAllOrdensServicoUseCase', () => {
  let useCase: GetAllOrdensServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllOrdensServicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetAllOrdensServicoUseCase);
    jest.clearAllMocks();
  });

  it('retorna a lista de ordens ativas do repositório', async () => {
    const resultado = { ordens: [{ id: 'ordem-1' }], count: 1 };
    mockOrdemRepo.findAll.mockResolvedValue(resultado);

    const result = await useCase.execute();

    expect(result).toBe(resultado);
    expect(mockOrdemRepo.findAll).toHaveBeenCalledTimes(1);
  });
});
