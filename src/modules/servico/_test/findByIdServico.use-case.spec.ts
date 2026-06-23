import { NotFoundException } from '@nestjs/common';
import { FindByIdServicoUseCase } from '../application/use-case/findByIdServico.use-case';
import { ServicoRepository } from '../domain/repository/servico.repository';

type ServicoRepositoryMock = {
  create: jest.Mock;
  findAll: jest.Mock;
  findById: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

const mockServico = {
  id: 'servico-uuid-1',
  nome: 'Troca de oleo',
  descricao: 'Troca completa de oleo e filtro',
  precoBase: 150,
  tempoEstimadoMin: 30,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createRepositoryMock = (): ServicoRepositoryMock => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('FindByIdServicoUseCase', () => {
  let repository: ServicoRepositoryMock;
  let useCase: FindByIdServicoUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new FindByIdServicoUseCase(repository as ServicoRepository);
  });

  it('should return the service when it exists', async () => {
    repository.findById.mockResolvedValue(mockServico);

    const result = await useCase.execute('servico-uuid-1');

    expect(result).toEqual(mockServico);
    expect(repository.findById).toHaveBeenCalledWith('servico-uuid-1');
  });

  it('should throw NotFoundException when service does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
