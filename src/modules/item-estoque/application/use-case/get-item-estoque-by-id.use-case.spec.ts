import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetItemEstoqueByIdUseCase } from './get-item-estoque-by-id.use-case';

const ITEM_ID = 'item-uuid-1';

const mockRepo = {
  findById: jest.fn(),
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

describe('GetItemEstoqueByIdUseCase', () => {
  let useCase: GetItemEstoqueByIdUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetItemEstoqueByIdUseCase,
        { provide: 'ITEM_ESTOQUE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetItemEstoqueByIdUseCase);
    jest.clearAllMocks();
  });

  it('retorna o item quando encontrado', async () => {
    mockRepo.findById.mockResolvedValue(item);

    const result = await useCase.execute(ITEM_ID);

    expect(result).toBe(item);
    expect(mockRepo.findById).toHaveBeenCalledWith(ITEM_ID);
  });

  it('lanca NotFoundException quando o item nao existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
