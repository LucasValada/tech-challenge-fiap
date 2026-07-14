import { Test, TestingModule } from '@nestjs/testing';
import { GetAllServicosUseCase } from './get-all-servicos.use-case';

const mockRepo = {
  findAll: jest.fn(),
};

describe('GetAllServicosUseCase', () => {
  let useCase: GetAllServicosUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllServicosUseCase,
        { provide: 'SERVICO_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetAllServicosUseCase);
    jest.clearAllMocks();
  });

  it('delega para o repositório e retorna a lista', async () => {
    const lista = { servico: [{ id: 's1' }, { id: 's2' }], count: 2 };
    mockRepo.findAll.mockResolvedValue(lista);

    const result = await useCase.execute();

    expect(result).toBe(lista);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });
});
