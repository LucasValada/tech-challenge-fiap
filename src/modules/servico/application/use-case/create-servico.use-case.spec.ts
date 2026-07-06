import { Test, TestingModule } from '@nestjs/testing';
import { CreateServicoUseCase } from './create-servico.use-case';

const mockRepo = {
  create: jest.fn(),
};

const dto = {
  nome: 'Troca de óleo',
  descricao: 'Troca completa de óleo e filtro',
  precoBase: 150,
  tempoEstimadoMin: 30,
};

const servicoMock = { id: 'servico-uuid-1', ...dto };

describe('CreateServicoUseCase', () => {
  let useCase: CreateServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateServicoUseCase,
        { provide: 'SERVICO_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(CreateServicoUseCase);
    jest.clearAllMocks();
  });

  it('cria serviço e retorna o resultado do repositório', async () => {
    mockRepo.create.mockResolvedValue(servicoMock);

    const result = await useCase.execute(dto);

    expect(result).toBe(servicoMock);
    expect(mockRepo.create).toHaveBeenCalledWith(dto);
  });
});
