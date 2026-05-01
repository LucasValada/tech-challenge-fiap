import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServicoService } from '../application/use-case/servico.service';
import { SERVICO_REPOSITORY } from '../domain/repository/servico.repository';

const mockServico = {
  id: 'servico-uuid-1',
  nome: 'Troca de óleo',
  descricao: 'Troca completa de óleo e filtro',
  precoBase: 150.0,
  tempoEstimadoMin: 30,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockServicoRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ServicoService', () => {
  let service: ServicoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicoService,
        { provide: SERVICO_REPOSITORY, useValue: mockServicoRepository },
      ],
    }).compile();

    service = module.get<ServicoService>(ServicoService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a service and return it', async () => {
      const dto = {
        nome: 'Troca de óleo',
        descricao: 'Troca completa de óleo e filtro',
        precoBase: 150.0,
        tempoEstimadoMin: 30,
      };
      mockServicoRepository.create.mockResolvedValue(mockServico);

      const result = await service.create(dto);

      expect(result).toEqual(mockServico);
      expect(mockServicoRepository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of services', async () => {
      mockServicoRepository.findAll.mockResolvedValue([mockServico]);

      const result = await service.findAll();

      expect(result).toEqual([mockServico]);
      expect(mockServicoRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return the service when it exists', async () => {
      mockServicoRepository.findById.mockResolvedValue(mockServico);

      const result = await service.findById('servico-uuid-1');

      expect(result).toEqual(mockServico);
      expect(mockServicoRepository.findById).toHaveBeenCalledWith(
        'servico-uuid-1',
      );
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockServicoRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the service when it exists', async () => {
      const dto = { precoBase: 180.0 };
      const updatedServico = { ...mockServico, precoBase: 180.0 };
      mockServicoRepository.findById.mockResolvedValue(mockServico);
      mockServicoRepository.update.mockResolvedValue(updatedServico);

      const result = await service.update('servico-uuid-1', dto);

      expect(result).toEqual(updatedServico);
      expect(mockServicoRepository.update).toHaveBeenCalledWith(
        'servico-uuid-1',
        dto,
      );
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockServicoRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { precoBase: 180.0 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockServicoRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft-delete the service when it exists', async () => {
      mockServicoRepository.findById.mockResolvedValue(mockServico);
      mockServicoRepository.delete.mockResolvedValue({
        ...mockServico,
        ativo: false,
      });

      await service.delete('servico-uuid-1');

      expect(mockServicoRepository.delete).toHaveBeenCalledWith(
        'servico-uuid-1',
      );
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockServicoRepository.findById.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockServicoRepository.delete).not.toHaveBeenCalled();
    });
  });
});
