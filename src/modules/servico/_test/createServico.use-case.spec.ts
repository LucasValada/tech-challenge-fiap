import { CreateServicoUseCase } from '../application/use-case/createServico.use-case';
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

describe('CreateServicoUseCase', () => {
  let repository: ServicoRepositoryMock;
  let useCase: CreateServicoUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new CreateServicoUseCase(repository as ServicoRepository);
  });

  it('should create a service and return it', async () => {
    const dto = {
      nome: 'Troca de oleo',
      descricao: 'Troca completa de oleo e filtro',
      precoBase: 150,
      tempoEstimadoMin: 30,
    };
    repository.create.mockResolvedValue(mockServico);

    const result = await useCase.execute(dto);

    expect(result).toEqual(mockServico);
    expect(repository.create).toHaveBeenCalledWith(dto);
  });
});
