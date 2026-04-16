import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VeiculoService } from './veiculo.service';
import { VeiculoRepository } from './veiculo.repository';

const mockVeiculo = {
  id: 'veiculo-uuid-1',
  clienteId: 'cliente-uuid-1',
  placa: 'ABC1D23',
  marca: 'Toyota',
  modelo: 'Corolla',
  ano: 2023,
  createdAt: new Date(),
  updatedAt: new Date(),
  cliente: { id: 'cliente-uuid-1', nome: 'John Doe' },
};

const mockVeiculoRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByPlaca: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('VeiculoService', () => {
  let service: VeiculoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VeiculoService,
        { provide: VeiculoRepository, useValue: mockVeiculoRepository },
      ],
    }).compile();

    service = module.get<VeiculoService>(VeiculoService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a vehicle and return it', async () => {
      const dto = {
        placa: 'ABC1D23',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2023,
        clienteId: 'cliente-uuid-1',
      };
      mockVeiculoRepository.create.mockResolvedValue(mockVeiculo);

      const result = await service.create(dto);

      expect(result).toEqual(mockVeiculo);
      expect(mockVeiculoRepository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of vehicles', async () => {
      mockVeiculoRepository.findAll.mockResolvedValue([mockVeiculo]);

      const result = await service.findAll();

      expect(result).toEqual([mockVeiculo]);
      expect(mockVeiculoRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return the vehicle when it exists', async () => {
      mockVeiculoRepository.findById.mockResolvedValue(mockVeiculo);

      const result = await service.findById('veiculo-uuid-1');

      expect(result).toEqual(mockVeiculo);
      expect(mockVeiculoRepository.findById).toHaveBeenCalledWith(
        'veiculo-uuid-1',
      );
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      mockVeiculoRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the vehicle when it exists', async () => {
      const dto = { marca: 'Honda' };
      const updatedVeiculo = { ...mockVeiculo, marca: 'Honda' };
      mockVeiculoRepository.findById.mockResolvedValue(mockVeiculo);
      mockVeiculoRepository.update.mockResolvedValue(updatedVeiculo);

      const result = await service.update('veiculo-uuid-1', dto);

      expect(result).toEqual(updatedVeiculo);
      expect(mockVeiculoRepository.update).toHaveBeenCalledWith(
        'veiculo-uuid-1',
        dto,
      );
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      mockVeiculoRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { marca: 'Honda' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockVeiculoRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete the vehicle when it exists', async () => {
      mockVeiculoRepository.findById.mockResolvedValue(mockVeiculo);
      mockVeiculoRepository.delete.mockResolvedValue(mockVeiculo);

      await service.delete('veiculo-uuid-1');

      expect(mockVeiculoRepository.delete).toHaveBeenCalledWith(
        'veiculo-uuid-1',
      );
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      mockVeiculoRepository.findById.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockVeiculoRepository.delete).not.toHaveBeenCalled();
    });
  });
});
