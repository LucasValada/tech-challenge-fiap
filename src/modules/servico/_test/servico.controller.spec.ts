import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicoController } from '../interface/controller/servico.controller';
import { ServicoService } from '../application/use-case/servico.service';

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

const mockServicoService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ServicoController', () => {
  let controller: ServicoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicoController],
      providers: [{ provide: ServicoService, useValue: mockServicoService }],
    }).compile();

    controller = module.get<ServicoController>(ServicoController);
    jest.clearAllMocks();
  });

  it('should call service.create with the DTO and return the result', async () => {
    const dto = {
      nome: 'Troca de óleo',
      descricao: 'Troca completa de óleo e filtro',
      precoBase: 150,
      tempoEstimadoMin: 30,
    };
    mockServicoService.create.mockResolvedValue(mockServico);

    const result = await controller.create(dto);

    expect(result).toEqual(mockServico);
    expect(mockServicoService.create).toHaveBeenCalledWith(dto);
  });

  it('should call service.findAll and return the result', async () => {
    mockServicoService.findAll.mockResolvedValue([mockServico]);

    const result = await controller.findAll();

    expect(result).toEqual([mockServico]);
    expect(mockServicoService.findAll).toHaveBeenCalled();
  });

  it('should call service.findById with the id and return the result', async () => {
    mockServicoService.findById.mockResolvedValue(mockServico);

    const result = await controller.findById('servico-uuid-1');

    expect(result).toEqual(mockServico);
    expect(mockServicoService.findById).toHaveBeenCalledWith('servico-uuid-1');
  });

  it('should call service.update with id and DTO and return the result', async () => {
    const dto = { precoBase: 180 };
    const updatedServico = { ...mockServico, precoBase: 180 };
    mockServicoService.update.mockResolvedValue(updatedServico);

    const result = await controller.update('servico-uuid-1', dto);

    expect(result).toEqual(updatedServico);
    expect(mockServicoService.update).toHaveBeenCalledWith(
      'servico-uuid-1',
      dto,
    );
  });

  it('should call service.delete with the id', async () => {
    mockServicoService.delete.mockResolvedValue(undefined);

    await controller.delete('servico-uuid-1');

    expect(mockServicoService.delete).toHaveBeenCalledWith('servico-uuid-1');
  });

  it('should propagate NotFoundException from service', async () => {
    mockServicoService.findById.mockRejectedValue(
      new NotFoundException('Servico not found'),
    );

    await expect(controller.findById('nonexistent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
