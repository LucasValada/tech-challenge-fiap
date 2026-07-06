import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetServicoByIdUseCase } from './get-servico-by-id.use-case';

const SERVICO_ID = 'servico-uuid-1';

const servicoMock = {
  id: SERVICO_ID,
  nome: 'Troca de óleo',
  descricao: null,
  precoBase: 150,
  tempoEstimadoMin: 30,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepo = {
  findById: jest.fn(),
};

describe('GetServicoByIdUseCase', () => {
  let useCase: GetServicoByIdUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetServicoByIdUseCase,
        { provide: 'SERVICO_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetServicoByIdUseCase);
    jest.clearAllMocks();
  });

  it('retorna o serviço quando encontrado', async () => {
    mockRepo.findById.mockResolvedValue(servicoMock);

    const result = await useCase.execute(SERVICO_ID);

    expect(result).toBe(servicoMock);
    expect(mockRepo.findById).toHaveBeenCalledWith(SERVICO_ID);
  });

  it('lança NotFoundException quando o serviço não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
