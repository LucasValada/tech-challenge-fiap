import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateServicoUseCase } from './update-servico.use-case';

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
  update: jest.fn(),
};

describe('UpdateServicoUseCase', () => {
  let useCase: UpdateServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateServicoUseCase,
        { provide: 'SERVICO_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(UpdateServicoUseCase);
    jest.clearAllMocks();
  });

  it('atualiza e retorna o serviço quando existe', async () => {
    const dto = { precoBase: 180 };
    const atualizado = { ...servicoMock, precoBase: 180 };
    mockRepo.findById.mockResolvedValue(servicoMock);
    mockRepo.update.mockResolvedValue(atualizado);

    const result = await useCase.execute(SERVICO_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockRepo.update).toHaveBeenCalledWith(SERVICO_ID, dto);
  });

  it('lança NotFoundException quando o serviço não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { precoBase: 180 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
