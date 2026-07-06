import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateItemEstoqueUseCase } from './update-item-estoque.use-case';

const ITEM_ID = 'item-uuid-1';

const mockRepo = {
  findById: jest.fn(),
  findBySku: jest.fn(),
  update: jest.fn(),
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

describe('UpdateItemEstoqueUseCase', () => {
  let useCase: UpdateItemEstoqueUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateItemEstoqueUseCase,
        { provide: 'ITEM_ESTOQUE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(UpdateItemEstoqueUseCase);
    jest.clearAllMocks();
  });

  it('atualiza item existente sem validar SKU quando ele nao vem no payload', async () => {
    const dto = { nome: 'Filtro premium' };
    const atualizado = { ...item, nome: 'Filtro premium' };
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.update.mockResolvedValue(atualizado);

    const result = await useCase.execute(ITEM_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockRepo.findBySku).not.toHaveBeenCalled();
    expect(mockRepo.update).toHaveBeenCalledWith(ITEM_ID, dto);
  });

  it('valida SKU único (excluindo o próprio id) quando SKU vem no payload', async () => {
    const dto = { sku: 'FLT-NOVO-001' };
    const atualizado = { ...item, sku: 'FLT-NOVO-001' };
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.findBySku.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue(atualizado);

    await useCase.execute(ITEM_ID, dto);

    expect(mockRepo.findBySku).toHaveBeenCalledWith('FLT-NOVO-001', ITEM_ID);
    expect(mockRepo.update).toHaveBeenCalledWith(ITEM_ID, dto);
  });

  it('lanca NotFoundException quando item nao existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { nome: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('lanca ConflictException quando SKU pertence a outro item', async () => {
    mockRepo.findById.mockResolvedValue(item);
    mockRepo.findBySku.mockResolvedValue({ ...item, id: 'outro-id' });

    await expect(
      useCase.execute(ITEM_ID, { sku: 'FLT-OUTRO-001' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
