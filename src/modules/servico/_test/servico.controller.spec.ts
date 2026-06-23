import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicoController } from '../interface/controller/servico.controller';
import { CreateServicoUseCase } from '../application/use-case/createServico.use-case';
import { DeleteServicoUseCase } from '../application/use-case/deleteServico.use-case';
import { FindAllServicoUseCase } from '../application/use-case/findAllServico.use-case';
import { FindByIdServicoUseCase } from '../application/use-case/findByIdServico.use-case';
import { UpdateServicoUseCase } from '../application/use-case/updateServico.use-case';

const mockServico = {
  id: 'servico-uuid-1',
  nome: 'Troca de óleo',
  descricao: 'Troca completa de óleo e filtro',
  precoBase: 150,
  tempoEstimadoMin: 30,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateServicoUseCase = { execute: jest.fn() };
const mockDeleteServicoUseCase = { execute: jest.fn() };
const mockFindAllServicoUseCase = { execute: jest.fn() };
const mockFindByIdServicoUseCase = { execute: jest.fn() };
const mockUpdateServicoUseCase = { execute: jest.fn() };

describe('ServicoController', () => {
  let controller: ServicoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicoController],
      providers: [
        { provide: CreateServicoUseCase, useValue: mockCreateServicoUseCase },
        { provide: DeleteServicoUseCase, useValue: mockDeleteServicoUseCase },
        { provide: FindAllServicoUseCase, useValue: mockFindAllServicoUseCase },
        {
          provide: FindByIdServicoUseCase,
          useValue: mockFindByIdServicoUseCase,
        },
        { provide: UpdateServicoUseCase, useValue: mockUpdateServicoUseCase },
      ],
    }).compile();

    controller = module.get<ServicoController>(ServicoController);
    jest.clearAllMocks();
  });

  it('should call CreateServicoUseCase with the DTO and return the result', async () => {
    const dto = {
      nome: 'Troca de óleo',
      descricao: 'Troca completa de óleo e filtro',
      precoBase: 150,
      tempoEstimadoMin: 30,
    };
    mockCreateServicoUseCase.execute.mockResolvedValue(mockServico);

    const result = await controller.create(dto);

    expect(result).toEqual(mockServico);
    expect(mockCreateServicoUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should call FindAllServicoUseCase and return the result', async () => {
    mockFindAllServicoUseCase.execute.mockResolvedValue([mockServico]);

    const result = await controller.findAll();

    expect(result).toEqual([mockServico]);
    expect(mockFindAllServicoUseCase.execute).toHaveBeenCalled();
  });

  it('should call FindByIdServicoUseCase with the id and return the result', async () => {
    mockFindByIdServicoUseCase.execute.mockResolvedValue(mockServico);

    const result = await controller.findById('servico-uuid-1');

    expect(result).toEqual(mockServico);
    expect(mockFindByIdServicoUseCase.execute).toHaveBeenCalledWith(
      'servico-uuid-1',
    );
  });

  it('should call UpdateServicoUseCase with id and DTO and return the result', async () => {
    const dto = { precoBase: 180 };
    const updatedServico = { ...mockServico, precoBase: 180 };
    mockUpdateServicoUseCase.execute.mockResolvedValue(updatedServico);

    const result = await controller.update('servico-uuid-1', dto);

    expect(result).toEqual(updatedServico);
    expect(mockUpdateServicoUseCase.execute).toHaveBeenCalledWith(
      'servico-uuid-1',
      dto,
    );
  });

  it('should call DeleteServicoUseCase with the id', async () => {
    mockDeleteServicoUseCase.execute.mockResolvedValue(undefined);

    await controller.delete('servico-uuid-1');

    expect(mockDeleteServicoUseCase.execute).toHaveBeenCalledWith(
      'servico-uuid-1',
    );
  });

  it('should propagate NotFoundException from use case', async () => {
    mockFindByIdServicoUseCase.execute.mockRejectedValue(
      new NotFoundException('Servico not found'),
    );

    await expect(controller.findById('nonexistent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
