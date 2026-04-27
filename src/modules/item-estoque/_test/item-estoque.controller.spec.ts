import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ItemEstoqueController } from '../interface/controller/item-estoque.controller';
import { ItemEstoqueService } from '../application/use-case/item-estoque.service';

const mockItem = {
  id: 'item-uuid-1',
  nome: 'Filtro de óleo',
  tipo: 'PECA',
  sku: 'FLT-OLEO-001',
  descricao: 'Filtro de óleo para motores 1.0 a 2.0',
  precoUnitario: 45.9,
  quantidadeEstoque: 50,
  estoqueMinimo: 10,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockItemEstoqueService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findBaixoEstoque: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ItemEstoqueController', () => {
  let controller: ItemEstoqueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemEstoqueController],
      providers: [
        { provide: ItemEstoqueService, useValue: mockItemEstoqueService },
      ],
    }).compile();

    controller = module.get<ItemEstoqueController>(ItemEstoqueController);
    jest.clearAllMocks();
  });

  it('should call service.create with the DTO and return the result', async () => {
    const dto = {
      nome: 'Filtro de óleo',
      tipo: 'PECA' as const,
      sku: 'FLT-OLEO-001',
      precoUnitario: 45.9,
      quantidadeEstoque: 50,
      estoqueMinimo: 10,
    };
    mockItemEstoqueService.create.mockResolvedValue(mockItem);

    const result = await controller.create(dto);

    expect(result).toEqual(mockItem);
    expect(mockItemEstoqueService.create).toHaveBeenCalledWith(dto);
  });

  it('should call service.findAll and return the result', async () => {
    mockItemEstoqueService.findAll.mockResolvedValue([mockItem]);

    const result = await controller.findAll();

    expect(result).toEqual([mockItem]);
    expect(mockItemEstoqueService.findAll).toHaveBeenCalledWith(undefined);
  });

  it('should call service.findAll with tipo filter', async () => {
    mockItemEstoqueService.findAll.mockResolvedValue([mockItem]);

    const result = await controller.findAll('PECA');

    expect(result).toEqual([mockItem]);
    expect(mockItemEstoqueService.findAll).toHaveBeenCalledWith('PECA');
  });

  it('should call service.findBaixoEstoque and return the result', async () => {
    const lowStockItem = { ...mockItem, quantidadeEstoque: 5 };
    mockItemEstoqueService.findBaixoEstoque.mockResolvedValue([lowStockItem]);

    const result = await controller.findBaixoEstoque();

    expect(result).toEqual([lowStockItem]);
    expect(mockItemEstoqueService.findBaixoEstoque).toHaveBeenCalled();
  });

  it('should call service.findById with the id and return the result', async () => {
    mockItemEstoqueService.findById.mockResolvedValue(mockItem);

    const result = await controller.findById('item-uuid-1');

    expect(result).toEqual(mockItem);
    expect(mockItemEstoqueService.findById).toHaveBeenCalledWith('item-uuid-1');
  });

  it('should call service.update with id and DTO and return the result', async () => {
    const dto = { nome: 'Filtro de óleo premium' };
    const updatedItem = { ...mockItem, nome: 'Filtro de óleo premium' };
    mockItemEstoqueService.update.mockResolvedValue(updatedItem);

    const result = await controller.update('item-uuid-1', dto);

    expect(result).toEqual(updatedItem);
    expect(mockItemEstoqueService.update).toHaveBeenCalledWith(
      'item-uuid-1',
      dto,
    );
  });

  it('should call service.delete with the id', async () => {
    mockItemEstoqueService.delete.mockResolvedValue(undefined);

    await controller.delete('item-uuid-1');

    expect(mockItemEstoqueService.delete).toHaveBeenCalledWith('item-uuid-1');
  });

  it('should propagate NotFoundException from service', async () => {
    mockItemEstoqueService.findById.mockRejectedValue(
      new NotFoundException('Item not found'),
    );

    await expect(controller.findById('nonexistent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should propagate ConflictException from service', async () => {
    const dto = {
      nome: 'Filtro de óleo',
      tipo: 'PECA' as const,
      sku: 'FLT-OLEO-001',
      precoUnitario: 45.9,
      quantidadeEstoque: 50,
      estoqueMinimo: 10,
    };
    mockItemEstoqueService.create.mockRejectedValue(
      new ConflictException('SKU already exists'),
    );

    await expect(controller.create(dto)).rejects.toThrow(ConflictException);
  });
});
