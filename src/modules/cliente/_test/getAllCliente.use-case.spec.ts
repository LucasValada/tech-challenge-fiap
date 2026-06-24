import { GetAllClientUseCase } from '../application/use-case/getAllCliente.use-case';
import { Cliente } from '../domain/entity/Client';
import { ClientRepository } from '../domain/repository/cliente.repository';

type ClientRepositoryMock = {
  getOne: jest.Mock;
  getAllClient: jest.Mock;
  createClient: jest.Mock;
  getByCpfCnpj: jest.Mock;
  updateClient: jest.Mock;
  deleteClient: jest.Mock;
};

const createRepositoryMock = (): ClientRepositoryMock => ({
  getOne: jest.fn(),
  getAllClient: jest.fn(),
  createClient: jest.fn(),
  getByCpfCnpj: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
});

const clienteCriado = new Cliente(
  'Joao da Silva',
  '(11)999999999',
  'joao@email.com',
  '529.982.247-25',
  'FISICA',
  'uuid-1',
  new Date(),
  new Date(),
);

describe('GetAllClientUseCase', () => {
  let repository: ClientRepositoryMock;
  let useCase: GetAllClientUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new GetAllClientUseCase(repository as ClientRepository);
  });

  it('retorna lista de clientes', async () => {
    const resultado = { client: [clienteCriado], count: 1 };
    repository.getAllClient.mockResolvedValue(resultado);

    const result = await useCase.execute();

    expect(result).toBe(resultado);
    expect(repository.getAllClient).toHaveBeenCalledTimes(1);
  });
});
