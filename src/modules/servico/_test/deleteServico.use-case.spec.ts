import { NotFoundException } from '@nestjs/common';
import { DeleteServicoUseCase } from '../application/use-case/deleteServico.use-case';
import { FindByIdServicoUseCase } from '../application/use-case/findByIdServico.use-case';
import { ServicoRepository } from '../domain/repository/servico.repository';

type ServicoRepositoryMock = {
  create: jest.Mock;
  findAll: jest.Mock;
  findById: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type FindByIdServicoUseCaseMock = {
  execute: jest.Mock;
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

describe('DeleteServicoUseCase', () => {
  let repository: ServicoRepositoryMock;
  let findByIdUseCase: FindByIdServicoUseCaseMock;
  let useCase: DeleteServicoUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    findByIdUseCase = {
      execute: jest.fn(),
    };
    useCase = new DeleteServicoUseCase(
      repository as ServicoRepository,
      findByIdUseCase as unknown as FindByIdServicoUseCase,
    );
  });

  it('should delete the service when it exists', async () => {
    findByIdUseCase.execute.mockResolvedValue(mockServico);
    repository.delete.mockResolvedValue({
      ...mockServico,
      ativo: false,
    });

    await useCase.execute('servico-uuid-1');

    expect(findByIdUseCase.execute).toHaveBeenCalledWith('servico-uuid-1');
    expect(repository.delete).toHaveBeenCalledWith('servico-uuid-1');
  });

  it('should throw NotFoundException when service does not exist', async () => {
    findByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Servico with id nonexistent-id not found'),
    );

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
