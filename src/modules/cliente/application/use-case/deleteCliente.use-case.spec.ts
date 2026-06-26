import { DeleteClienteUseCase } from './deleteCliente.use-case';
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

describe('DeleteClienteUseCase', () => {
  let repository: ClienteRepositoryMock;
  let useCase: DeleteClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new DeleteClienteUseCase(repository as ClienteRepository);
  });

  it('deleta cliente', async () => {
    repository.deleteCliente.mockResolvedValue(undefined);

    await useCase.execute('uuid-1');

    expect(repository.deleteCliente).toHaveBeenCalledWith('uuid-1');
  });
});
