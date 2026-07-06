import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VeiculoController } from './veiculo.controller';
import { CreateVeiculoUseCase } from '../../application/use-case/create-veiculo.use-case';
import { GetAllVeiculosUseCase } from '../../application/use-case/get-all-veiculos.use-case';
import { GetVeiculoByIdUseCase } from '../../application/use-case/get-veiculo-by-id.use-case';
import { UpdateVeiculoUseCase } from '../../application/use-case/update-veiculo.use-case';
import { DeleteVeiculoUseCase } from '../../application/use-case/delete-veiculo.use-case';

const VEICULO_ID = 'veiculo-uuid-1';

const mockVeiculo = {
  id: VEICULO_ID,
  clienteId: 'cliente-uuid-1',
  placa: 'ABC1D23',
  marca: 'Toyota',
  modelo: 'Corolla',
  ano: 2023,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateVeiculo = { execute: jest.fn() };
const mockGetAllVeiculos = { execute: jest.fn() };
const mockGetVeiculoById = { execute: jest.fn() };
const mockUpdateVeiculo = { execute: jest.fn() };
const mockDeleteVeiculo = { execute: jest.fn() };

describe('VeiculoController', () => {
  let controller: VeiculoController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [VeiculoController],
      providers: [
        { provide: CreateVeiculoUseCase, useValue: mockCreateVeiculo },
        { provide: GetAllVeiculosUseCase, useValue: mockGetAllVeiculos },
        { provide: GetVeiculoByIdUseCase, useValue: mockGetVeiculoById },
        { provide: UpdateVeiculoUseCase, useValue: mockUpdateVeiculo },
        { provide: DeleteVeiculoUseCase, useValue: mockDeleteVeiculo },
      ],
    }).compile();

    controller = moduleRef.get<VeiculoController>(VeiculoController);
    jest.clearAllMocks();
  });

  it('POST / delega para CreateVeiculoUseCase com o DTO', async () => {
    const dto = {
      placa: 'ABC1D23',
      marca: 'Toyota',
      modelo: 'Corolla',
      ano: 2023,
      clienteId: 'cliente-uuid-1',
    };
    mockCreateVeiculo.execute.mockResolvedValue(mockVeiculo);

    const result = await controller.create(dto);

    expect(result).toBe(mockVeiculo);
    expect(mockCreateVeiculo.execute).toHaveBeenCalledWith(dto);
  });

  it('GET / delega para GetAllVeiculosUseCase', async () => {
    const lista = { veiculo: [mockVeiculo], count: 1 };
    mockGetAllVeiculos.execute.mockResolvedValue(lista);

    const result = await controller.findAll();

    expect(result).toBe(lista);
    expect(mockGetAllVeiculos.execute).toHaveBeenCalled();
  });

  it('GET /:id delega para GetVeiculoByIdUseCase', async () => {
    mockGetVeiculoById.execute.mockResolvedValue(mockVeiculo);

    const result = await controller.findById(VEICULO_ID);

    expect(result).toBe(mockVeiculo);
    expect(mockGetVeiculoById.execute).toHaveBeenCalledWith(VEICULO_ID);
  });

  it('PUT /:id delega para UpdateVeiculoUseCase', async () => {
    const dto = { marca: 'Honda' };
    const atualizado = { ...mockVeiculo, marca: 'Honda' };
    mockUpdateVeiculo.execute.mockResolvedValue(atualizado);

    const result = await controller.update(VEICULO_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockUpdateVeiculo.execute).toHaveBeenCalledWith(VEICULO_ID, dto);
  });

  it('DELETE /:id delega para DeleteVeiculoUseCase', async () => {
    mockDeleteVeiculo.execute.mockResolvedValue(undefined);

    await controller.delete(VEICULO_ID);

    expect(mockDeleteVeiculo.execute).toHaveBeenCalledWith(VEICULO_ID);
  });

  it('propaga NotFoundException do use case', async () => {
    mockGetVeiculoById.execute.mockRejectedValue(
      new NotFoundException('Veículo nao encontrado'),
    );

    await expect(controller.findById('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });
});
