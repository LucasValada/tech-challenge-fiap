import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicoController } from './servico.controller';
import { CreateServicoUseCase } from '../../application/use-case/create-servico.use-case';
import { GetAllServicosUseCase } from '../../application/use-case/get-all-servicos.use-case';
import { GetServicoByIdUseCase } from '../../application/use-case/get-servico-by-id.use-case';
import { UpdateServicoUseCase } from '../../application/use-case/update-servico.use-case';
import { DeleteServicoUseCase } from '../../application/use-case/delete-servico.use-case';

const SERVICO_ID = 'servico-uuid-1';

const mockServico = {
  id: SERVICO_ID,
  nome: 'Troca de óleo',
  descricao: 'Troca completa de óleo e filtro',
  precoBase: 150,
  tempoEstimadoMin: 30,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreate = { execute: jest.fn() };
const mockGetAll = { execute: jest.fn() };
const mockGetById = { execute: jest.fn() };
const mockUpdate = { execute: jest.fn() };
const mockDelete = { execute: jest.fn() };

describe('ServicoController', () => {
  let controller: ServicoController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ServicoController],
      providers: [
        { provide: CreateServicoUseCase, useValue: mockCreate },
        { provide: GetAllServicosUseCase, useValue: mockGetAll },
        { provide: GetServicoByIdUseCase, useValue: mockGetById },
        { provide: UpdateServicoUseCase, useValue: mockUpdate },
        { provide: DeleteServicoUseCase, useValue: mockDelete },
      ],
    }).compile();

    controller = moduleRef.get<ServicoController>(ServicoController);
    jest.clearAllMocks();
  });

  it('POST / delega para CreateServicoUseCase', async () => {
    const dto = {
      nome: 'Troca de óleo',
      descricao: 'Troca completa de óleo e filtro',
      precoBase: 150,
      tempoEstimadoMin: 30,
    };
    mockCreate.execute.mockResolvedValue(mockServico);

    const result = await controller.create(dto);

    expect(result).toBe(mockServico);
    expect(mockCreate.execute).toHaveBeenCalledWith(dto);
  });

  it('GET / delega para GetAllServicosUseCase', async () => {
    const lista = { servico: [mockServico], count: 1 };
    mockGetAll.execute.mockResolvedValue(lista);

    const result = await controller.findAll();

    expect(result).toBe(lista);
    expect(mockGetAll.execute).toHaveBeenCalled();
  });

  it('GET /:id delega para GetServicoByIdUseCase', async () => {
    mockGetById.execute.mockResolvedValue(mockServico);

    const result = await controller.findById(SERVICO_ID);

    expect(result).toBe(mockServico);
    expect(mockGetById.execute).toHaveBeenCalledWith(SERVICO_ID);
  });

  it('PUT /:id delega para UpdateServicoUseCase', async () => {
    const dto = { precoBase: 180 };
    const atualizado = { ...mockServico, precoBase: 180 };
    mockUpdate.execute.mockResolvedValue(atualizado);

    const result = await controller.update(SERVICO_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockUpdate.execute).toHaveBeenCalledWith(SERVICO_ID, dto);
  });

  it('DELETE /:id delega para DeleteServicoUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined);

    await controller.delete(SERVICO_ID);

    expect(mockDelete.execute).toHaveBeenCalledWith(SERVICO_ID);
  });

  it('propaga NotFoundException do use case', async () => {
    mockGetById.execute.mockRejectedValue(
      new NotFoundException('Serviço não encontrado'),
    );

    await expect(controller.findById('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });
});
