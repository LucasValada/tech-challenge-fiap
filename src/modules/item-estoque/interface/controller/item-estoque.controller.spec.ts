import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ItemEstoqueController } from './item-estoque.controller';
import { CreateItemEstoqueUseCase } from '../../application/use-case/create-item-estoque.use-case';
import { GetAllItensEstoqueUseCase } from '../../application/use-case/get-all-itens-estoque.use-case';
import { GetItemEstoqueByIdUseCase } from '../../application/use-case/get-item-estoque-by-id.use-case';
import { GetItensBaixoEstoqueUseCase } from '../../application/use-case/get-itens-baixo-estoque.use-case';
import { UpdateItemEstoqueUseCase } from '../../application/use-case/update-item-estoque.use-case';
import { DeleteItemEstoqueUseCase } from '../../application/use-case/delete-item-estoque.use-case';

const ITEM_ID = 'item-uuid-1';

const mockItem = {
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

const mockCreate = { execute: jest.fn() };
const mockGetAll = { execute: jest.fn() };
const mockGetById = { execute: jest.fn() };
const mockGetBaixoEstoque = { execute: jest.fn() };
const mockUpdate = { execute: jest.fn() };
const mockDelete = { execute: jest.fn() };

describe('ItemEstoqueController', () => {
  let controller: ItemEstoqueController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ItemEstoqueController],
      providers: [
        { provide: CreateItemEstoqueUseCase, useValue: mockCreate },
        { provide: GetAllItensEstoqueUseCase, useValue: mockGetAll },
        { provide: GetItemEstoqueByIdUseCase, useValue: mockGetById },
        {
          provide: GetItensBaixoEstoqueUseCase,
          useValue: mockGetBaixoEstoque,
        },
        { provide: UpdateItemEstoqueUseCase, useValue: mockUpdate },
        { provide: DeleteItemEstoqueUseCase, useValue: mockDelete },
      ],
    }).compile();

    controller = moduleRef.get(ItemEstoqueController);
    jest.clearAllMocks();
  });

  it('POST / delega para CreateItemEstoqueUseCase', async () => {
    const dto = {
      nome: 'Filtro de óleo',
      tipo: 'PECA' as const,
      sku: 'FLT-OLEO-001',
      precoUnitario: 45.9,
      quantidadeEstoque: 50,
      estoqueMinimo: 10,
    };
    mockCreate.execute.mockResolvedValue(mockItem);

    const result = await controller.create(dto);

    expect(result).toBe(mockItem);
    expect(mockCreate.execute).toHaveBeenCalledWith(dto);
  });

  it('GET / delega para GetAllItensEstoqueUseCase sem filtro', async () => {
    const lista = { itemEstoque: [mockItem], count: 1 };
    mockGetAll.execute.mockResolvedValue(lista);

    const result = await controller.findAll();

    expect(result).toBe(lista);
    expect(mockGetAll.execute).toHaveBeenCalledWith(undefined);
  });

  it('GET / propaga filtro tipo', async () => {
    const lista = { itemEstoque: [mockItem], count: 1 };
    mockGetAll.execute.mockResolvedValue(lista);

    await controller.findAll('PECA');

    expect(mockGetAll.execute).toHaveBeenCalledWith('PECA');
  });

  it('GET /baixo-estoque delega para GetItensBaixoEstoqueUseCase', async () => {
    const lista = { itemEstoque: [], count: 0 };
    mockGetBaixoEstoque.execute.mockResolvedValue(lista);

    const result = await controller.findBaixoEstoque();

    expect(result).toBe(lista);
    expect(mockGetBaixoEstoque.execute).toHaveBeenCalled();
  });

  it('GET /:id delega para GetItemEstoqueByIdUseCase', async () => {
    mockGetById.execute.mockResolvedValue(mockItem);

    const result = await controller.findById(ITEM_ID);

    expect(result).toBe(mockItem);
    expect(mockGetById.execute).toHaveBeenCalledWith(ITEM_ID);
  });

  it('PUT /:id delega para UpdateItemEstoqueUseCase', async () => {
    const dto = { nome: 'Filtro premium' };
    const atualizado = { ...mockItem, nome: 'Filtro premium' };
    mockUpdate.execute.mockResolvedValue(atualizado);

    const result = await controller.update(ITEM_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockUpdate.execute).toHaveBeenCalledWith(ITEM_ID, dto);
  });

  it('DELETE /:id delega para DeleteItemEstoqueUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined);

    await controller.delete(ITEM_ID);

    expect(mockDelete.execute).toHaveBeenCalledWith(ITEM_ID);
  });

  it('propaga NotFoundException do use case', async () => {
    mockGetById.execute.mockRejectedValue(
      new NotFoundException('Item de estoque não encontrado'),
    );

    await expect(controller.findById('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });
});
