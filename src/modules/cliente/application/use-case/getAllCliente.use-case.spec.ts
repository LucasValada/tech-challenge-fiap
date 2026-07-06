import { GetAllClienteUseCase } from './getAllCliente.use-case';
import { Cliente } from '../../domain/entity/Cliente';
import { ClienteRepository } from '../../domain/repository/cliente.repository';

type ClienteRepositoryMock = {
  getOne: jest.Mock;
  getAllCliente: jest.Mock;
  createCliente: jest.Mock;
  getByCpfCnpj: jest.Mock;
  updateCliente: jest.Mock;
  deleteCliente: jest.Mock;
};

const createRepositoryMock = (): ClienteRepositoryMock => ({
  getOne: jest.fn(),
  getAllCliente: jest.fn(),
  createCliente: jest.fn(),
  getByCpfCnpj: jest.fn(),
  updateCliente: jest.fn(),
  deleteCliente: jest.fn(),
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

describe('GetAllClienteUseCase', () => {
  let repository: ClienteRepositoryMock;
  let useCase: GetAllClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new GetAllClienteUseCase(repository as ClienteRepository);
  });

  it('retorna lista de clientes', async () => {
    const resultado = { client: [clienteCriado], count: 1 };
    repository.getAllCliente.mockResolvedValue(resultado);

    const result = await useCase.execute();

    expect(result).toBe(resultado);
    expect(repository.getAllCliente).toHaveBeenCalledTimes(1);
  });
});
