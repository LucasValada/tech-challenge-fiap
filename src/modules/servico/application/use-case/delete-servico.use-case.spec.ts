import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteServicoUseCase } from './delete-servico.use-case';

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
  delete: jest.fn(),
};

describe('DeleteServicoUseCase', () => {
  let useCase: DeleteServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteServicoUseCase,
        { provide: 'SERVICO_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteServicoUseCase);
    jest.clearAllMocks();
  });

  it('faz soft-delete quando o serviço existe', async () => {
    mockRepo.findById.mockResolvedValue(servicoMock);
    mockRepo.delete.mockResolvedValue({ ...servicoMock, ativo: false });

    await useCase.execute(SERVICO_ID);

    expect(mockRepo.delete).toHaveBeenCalledWith(SERVICO_ID);
  });

  it('lança NotFoundException quando o serviço não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
