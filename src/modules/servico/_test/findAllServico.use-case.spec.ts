import { FindAllServicoUseCase } from '../application/use-case/findAllServico.use-case';
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

describe('FindAllServicoUseCase', () => {
  let repository: ServicoRepositoryMock;
  let useCase: FindAllServicoUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new FindAllServicoUseCase(repository as ServicoRepository);
  });

  it('should return an array of services', async () => {
    repository.findAll.mockResolvedValue([mockServico]);

    const result = await useCase.execute();

    expect(result).toEqual([mockServico]);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });
});
