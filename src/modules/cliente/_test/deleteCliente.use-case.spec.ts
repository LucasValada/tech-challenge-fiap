import { DeleteClientUseCase } from '../application/use-case/deleteCliente.use-case';
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

describe('DeleteClientUseCase', () => {
  let repository: ClientRepositoryMock;
  let useCase: DeleteClientUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new DeleteClientUseCase(repository as ClientRepository);
  });

  it('deleta cliente', async () => {
    repository.deleteClient.mockResolvedValue(undefined);

    await useCase.execute('uuid-1');

    expect(repository.deleteClient).toHaveBeenCalledWith('uuid-1');
  });
});
