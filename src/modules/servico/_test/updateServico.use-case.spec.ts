import { NotFoundException } from '@nestjs/common';
import { FindByIdServicoUseCase } from '../application/use-case/findByIdServico.use-case';
import { UpdateServicoUseCase } from '../application/use-case/updateServico.use-case';
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

describe('UpdateServicoUseCase', () => {
  let repository: ServicoRepositoryMock;
  let findByIdUseCase: FindByIdServicoUseCaseMock;
  let useCase: UpdateServicoUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    findByIdUseCase = {
      execute: jest.fn(),
    };
    useCase = new UpdateServicoUseCase(
      repository as ServicoRepository,
      findByIdUseCase as unknown as FindByIdServicoUseCase,
    );
  });

  it('should update and return the service when it exists', async () => {
    const dto = { precoBase: 180 };
    const updatedServico = { ...mockServico, precoBase: 180 };
    findByIdUseCase.execute.mockResolvedValue(mockServico);
    repository.update.mockResolvedValue(updatedServico);

    const result = await useCase.execute('servico-uuid-1', dto);

    expect(result).toEqual(updatedServico);
    expect(findByIdUseCase.execute).toHaveBeenCalledWith('servico-uuid-1');
    expect(repository.update).toHaveBeenCalledWith('servico-uuid-1', dto);
  });

  it('should throw NotFoundException when service does not exist', async () => {
    findByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Servico with id nonexistent-id not found'),
    );

    await expect(
      useCase.execute('nonexistent-id', { precoBase: 180 }),
    ).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
