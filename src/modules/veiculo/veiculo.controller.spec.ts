import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VeiculoController } from './veiculo.controller';
import { VeiculoService } from './veiculo.service';

const mockVeiculo = {
  id: 'veiculo-uuid-1',
  clienteId: 'cliente-uuid-1',
  placa: 'ABC1D23',
  marca: 'Toyota',
  modelo: 'Corolla',
  ano: 2023,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVeiculoService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('VeiculoController', () => {
  let controller: VeiculoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VeiculoController],
      providers: [{ provide: VeiculoService, useValue: mockVeiculoService }],
    }).compile();

    controller = module.get<VeiculoController>(VeiculoController);
    jest.clearAllMocks();
  });

  it('should call service.create with the DTO and return the result', async () => {
    const dto = {
      placa: 'ABC1D23',
      marca: 'Toyota',
      modelo: 'Corolla',
      ano: 2023,
      clienteId: 'cliente-uuid-1',
    };
    mockVeiculoService.create.mockResolvedValue(mockVeiculo);

    const result = await controller.create(dto);

    expect(result).toEqual(mockVeiculo);
    expect(mockVeiculoService.create).toHaveBeenCalledWith(dto);
  });

  it('should call service.findAll and return the result', async () => {
    mockVeiculoService.findAll.mockResolvedValue([mockVeiculo]);

    const result = await controller.findAll();

    expect(result).toEqual([mockVeiculo]);
    expect(mockVeiculoService.findAll).toHaveBeenCalled();
  });

  it('should call service.findById with the id and return the result', async () => {
    mockVeiculoService.findById.mockResolvedValue(mockVeiculo);

    const result = await controller.findById('veiculo-uuid-1');

    expect(result).toEqual(mockVeiculo);
    expect(mockVeiculoService.findById).toHaveBeenCalledWith('veiculo-uuid-1');
  });

  it('should call service.update with id and DTO and return the result', async () => {
    const dto = { marca: 'Honda' };
    const updatedVeiculo = { ...mockVeiculo, marca: 'Honda' };
    mockVeiculoService.update.mockResolvedValue(updatedVeiculo);

    const result = await controller.update('veiculo-uuid-1', dto);

    expect(result).toEqual(updatedVeiculo);
    expect(mockVeiculoService.update).toHaveBeenCalledWith(
      'veiculo-uuid-1',
      dto,
    );
  });

  it('should call service.delete with the id', async () => {
    mockVeiculoService.delete.mockResolvedValue(undefined);

    await controller.delete('veiculo-uuid-1');

    expect(mockVeiculoService.delete).toHaveBeenCalledWith('veiculo-uuid-1');
  });

  it('should propagate NotFoundException from service', async () => {
    mockVeiculoService.findById.mockRejectedValue(
      new NotFoundException('Vehicle not found'),
    );

    await expect(controller.findById('nonexistent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
