import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ItemEstoqueService } from './item-estoque.service';
import { ItemEstoqueRepository } from './item-estoque.repository';

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

const mockItemEstoqueRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySku: jest.fn(),
  findBaixoEstoque: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ItemEstoqueService', () => {
  let service: ItemEstoqueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemEstoqueService,
        {
          provide: ItemEstoqueRepository,
          useValue: mockItemEstoqueRepository,
        },
      ],
    }).compile();

    service = module.get<ItemEstoqueService>(ItemEstoqueService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an item and return it', async () => {
      const dto = {
        nome: 'Filtro de óleo',
        tipo: 'PECA' as const,
        sku: 'FLT-OLEO-001',
        descricao: 'Filtro de óleo para motores 1.0 a 2.0',
        precoUnitario: 45.9,
        quantidadeEstoque: 50,
        estoqueMinimo: 10,
      };
      mockItemEstoqueRepository.findBySku.mockResolvedValue(null);
      mockItemEstoqueRepository.create.mockResolvedValue(mockItem);

      const result = await service.create(dto);

      expect(result).toEqual(mockItem);
      expect(mockItemEstoqueRepository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException when SKU already exists', async () => {
      const dto = {
        nome: 'Filtro de óleo',
        tipo: 'PECA' as const,
        sku: 'FLT-OLEO-001',
        precoUnitario: 45.9,
        quantidadeEstoque: 50,
        estoqueMinimo: 10,
      };
      mockItemEstoqueRepository.findBySku.mockResolvedValue(mockItem);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockItemEstoqueRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of items', async () => {
      mockItemEstoqueRepository.findAll.mockResolvedValue([mockItem]);

      const result = await service.findAll();

      expect(result).toEqual([mockItem]);
      expect(mockItemEstoqueRepository.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should filter by tipo when provided', async () => {
      mockItemEstoqueRepository.findAll.mockResolvedValue([mockItem]);

      const result = await service.findAll('PECA');

      expect(result).toEqual([mockItem]);
      expect(mockItemEstoqueRepository.findAll).toHaveBeenCalledWith('PECA');
    });
  });

  describe('findById', () => {
    it('should return the item when it exists', async () => {
      mockItemEstoqueRepository.findById.mockResolvedValue(mockItem);

      const result = await service.findById('item-uuid-1');

      expect(result).toEqual(mockItem);
      expect(mockItemEstoqueRepository.findById).toHaveBeenCalledWith(
        'item-uuid-1',
      );
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockItemEstoqueRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBaixoEstoque', () => {
    it('should return items with low stock', async () => {
      const lowStockItem = { ...mockItem, quantidadeEstoque: 5 };
      mockItemEstoqueRepository.findBaixoEstoque.mockResolvedValue([
        lowStockItem,
      ]);

      const result = await service.findBaixoEstoque();

      expect(result).toEqual([lowStockItem]);
      expect(mockItemEstoqueRepository.findBaixoEstoque).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the item when it exists', async () => {
      const dto = { nome: 'Filtro de óleo premium' };
      const updatedItem = { ...mockItem, nome: 'Filtro de óleo premium' };
      mockItemEstoqueRepository.findById.mockResolvedValue(mockItem);
      mockItemEstoqueRepository.update.mockResolvedValue(updatedItem);

      const result = await service.update('item-uuid-1', dto);

      expect(result).toEqual(updatedItem);
      expect(mockItemEstoqueRepository.update).toHaveBeenCalledWith(
        'item-uuid-1',
        dto,
      );
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockItemEstoqueRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { nome: 'Novo nome' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockItemEstoqueRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updating SKU to an existing one', async () => {
      const otherItem = { ...mockItem, id: 'item-uuid-2', sku: 'FLT-AR-001' };
      mockItemEstoqueRepository.findById.mockResolvedValue(mockItem);
      mockItemEstoqueRepository.findBySku.mockResolvedValue(otherItem);

      await expect(
        service.update('item-uuid-1', { sku: 'FLT-AR-001' }),
      ).rejects.toThrow(ConflictException);
      expect(mockItemEstoqueRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating SKU to the same value', async () => {
      const dto = { sku: 'FLT-OLEO-001' };
      mockItemEstoqueRepository.findById.mockResolvedValue(mockItem);
      mockItemEstoqueRepository.findBySku.mockResolvedValue(mockItem);
      mockItemEstoqueRepository.update.mockResolvedValue(mockItem);

      const result = await service.update('item-uuid-1', dto);

      expect(result).toEqual(mockItem);
      expect(mockItemEstoqueRepository.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft-delete the item when it exists', async () => {
      mockItemEstoqueRepository.findById.mockResolvedValue(mockItem);
      mockItemEstoqueRepository.delete.mockResolvedValue({
        ...mockItem,
        ativo: false,
      });

      await service.delete('item-uuid-1');

      expect(mockItemEstoqueRepository.delete).toHaveBeenCalledWith(
        'item-uuid-1',
      );
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockItemEstoqueRepository.findById.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockItemEstoqueRepository.delete).not.toHaveBeenCalled();
    });
  });
});
