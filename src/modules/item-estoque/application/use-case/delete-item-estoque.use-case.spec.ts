import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteItemEstoqueUseCase } from './delete-item-estoque.use-case';

const ITEM_ID = 'item-uuid-1';

const mockRepo = {
  findById: jest.fn(),
  delete: jest.fn(),
};

const item = {
  id: ITEM_ID,
  nome: 'Filtro de óleo',
  tipo: 'PECA',
  sku: 'FLT-OLEO-001',
  descricao: null,
  precoUnitario: 45.9,
  quantidadeEstoque: 50,
  estoqueMinimo: 10,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DeleteItemEstoqueUseCase', () => {
  let useCase: DeleteItemEstoqueUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteItemEstoqueUseCase,
        { provide: 'ITEM_ESTOQUE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteItemEstoqueUseCase);
    jest.clearAllMocks();
  });

  it('faz soft-delete quando item existe', async () => {
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.delete.mockResolvedValue({ ...item, ativo: false });

    await useCase.execute(ITEM_ID);

    expect(mockRepo.delete).toHaveBeenCalledWith(ITEM_ID);
  });

  it('lanca NotFoundException quando item nao existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
