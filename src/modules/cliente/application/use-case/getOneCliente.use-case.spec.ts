import { NotFoundException } from '@nestjs/common';
import { GetOneClienteUseCase } from './getOneCliente.use-case';
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

describe('GetOneClienteUseCase', () => {
  let repository: ClienteRepositoryMock;
  let useCase: GetOneClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new GetOneClienteUseCase(repository as ClienteRepository);
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
