import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateItemEstoqueUseCase } from './create-item-estoque.use-case';

const mockRepo = {
  create: jest.fn(),
  findBySku: jest.fn(),
};

const dto = {
  nome: 'Filtro de óleo',
  tipo: 'PECA' as const,
  sku: 'FLT-OLEO-001',
  descricao: 'Filtro de óleo para motores 1.0 a 2.0',
  precoUnitario: 45.9,
  quantidadeEstoque: 50,
  estoqueMinimo: 10,
};

const itemCriado = {
  id: 'item-uuid-1',
  ...dto,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CreateItemEstoqueUseCase', () => {
  let useCase: CreateItemEstoqueUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateItemEstoqueUseCase,
        { provide: 'ITEM_ESTOQUE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(CreateItemEstoqueUseCase);
    jest.clearAllMocks();
  });

  it('cria item quando SKU nao existe', async () => {
    mockRepo.findBySku.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(itemCriado);

    const result = await useCase.execute(dto);

    expect(result).toBe(itemCriado);
    expect(mockRepo.findBySku).toHaveBeenCalledWith(dto.sku, undefined);
    expect(mockRepo.create).toHaveBeenCalledWith(dto);
  });

  it('lanca ConflictException quando SKU ja existe', async () => {
    mockRepo.findBySku.mockResolvedValue(itemCriado);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
