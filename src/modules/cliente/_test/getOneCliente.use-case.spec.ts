import { NotFoundException } from '@nestjs/common';
import { GetOneClienteUseCase } from '../application/use-case/getOnecliente.use-case';
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

describe('GetOneClienteUseCase', () => {
  let repository: ClientRepositoryMock;
  let useCase: GetOneClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new GetOneClienteUseCase(repository as ClientRepository);
  });

  it('retorna cliente quando encontrado', async () => {
    repository.getOne.mockResolvedValue(clienteCriado);

    const result = await useCase.execute('uuid-1');

    expect(result).toBe(clienteCriado);
    expect(repository.getOne).toHaveBeenCalledWith('uuid-1');
  });

  it('lanca NotFoundException quando nao encontrado', async () => {
    repository.getOne.mockResolvedValue(null);

    await expect(useCase.execute('uuid-inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });
});
