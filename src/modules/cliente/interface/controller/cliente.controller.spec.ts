import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClienteController } from './cliente.controller';
import { CreateClienteUseCase } from '../../application/use-case/create-cliente.use-case';
import { GetAllClientesUseCase } from '../../application/use-case/get-all-clientes.use-case';
import { GetClienteByIdUseCase } from '../../application/use-case/get-cliente-by-id.use-case';
import { UpdateClienteUseCase } from '../../application/use-case/update-cliente.use-case';
import { DeleteClienteUseCase } from '../../application/use-case/delete-cliente.use-case';

const CLIENTE_ID = 'a3b2f4e0-4d1e-4b52-8c17-9d3f2e2b1c0a';

const mockCliente = {
  id: CLIENTE_ID,
  nome: 'João Silva',
  telefone: '11999999999',
  email: 'joao@teste.com',
  cpfCnpj: '52998224725',
  tipoPessoa: 'FISICA' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreate = { execute: jest.fn() };
const mockGetAll = { execute: jest.fn() };
const mockGetById = { execute: jest.fn() };
const mockUpdate = { execute: jest.fn() };
const mockDelete = { execute: jest.fn() };

describe('ClienteController', () => {
  let controller: ClienteController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ClienteController],
      providers: [
        { provide: CreateClienteUseCase, useValue: mockCreate },
        { provide: GetAllClientesUseCase, useValue: mockGetAll },
        { provide: GetClienteByIdUseCase, useValue: mockGetById },
        { provide: UpdateClienteUseCase, useValue: mockUpdate },
        { provide: DeleteClienteUseCase, useValue: mockDelete },
      ],
    }).compile();

    controller = moduleRef.get<ClienteController>(ClienteController);
    jest.clearAllMocks();
  });

  it('POST / delega para CreateClienteUseCase', async () => {
    const dto = {
      nome: 'João',
      telefone: '11999999999',
      email: 'joao@teste.com',
      cpfCnpj: '52998224725',
      tipoPessoa: 'FISICA' as const,
    };
    mockCreate.execute.mockResolvedValue(mockCliente);

    const result = await controller.create(dto);

    expect(result).toBe(mockCliente);
    expect(mockCreate.execute).toHaveBeenCalledWith(dto);
  });

  it('GET / delega para GetAllClientesUseCase', async () => {
    const lista = { cliente: [mockCliente], count: 1 };
    mockGetAll.execute.mockResolvedValue(lista);

    const result = await controller.findAll();

    expect(result).toBe(lista);
    expect(mockGetAll.execute).toHaveBeenCalled();
  });

  it('GET /:id delega para GetClienteByIdUseCase', async () => {
    mockGetById.execute.mockResolvedValue(mockCliente);

    const result = await controller.findById(CLIENTE_ID);

    expect(result).toBe(mockCliente);
    expect(mockGetById.execute).toHaveBeenCalledWith(CLIENTE_ID);
  });

  it('PUT /:id delega para UpdateClienteUseCase', async () => {
    const dto = { nome: 'Atualizado' };
    const atualizado = { ...mockCliente, nome: 'Atualizado' };
    mockUpdate.execute.mockResolvedValue(atualizado);

    const result = await controller.update(CLIENTE_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockUpdate.execute).toHaveBeenCalledWith(CLIENTE_ID, dto);
  });

  it('DELETE /:id delega para DeleteClienteUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined);

    await controller.delete(CLIENTE_ID);

    expect(mockDelete.execute).toHaveBeenCalledWith(CLIENTE_ID);
  });

  it('propaga NotFoundException do use case', async () => {
    mockGetById.execute.mockRejectedValue(
      new NotFoundException('Cliente não encontrado'),
    );

    await expect(controller.findById(CLIENTE_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});
