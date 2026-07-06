import { ConflictException } from '@nestjs/common';
import { UpdateClienteUseCase } from './updateCliente.use-case';
import { ClienteDto } from '../application/dto/cliente.dto';
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

const clienteDto: ClienteDto = {
  nome: 'Joao da Silva',
  telefone: '(11)999999999',
  email: 'joao@email.com',
  cpfCnpj: '529.982.247-25',
  tipoPessoa: 'FISICA',
};

const clienteCriado = new Cliente(
  clienteDto.nome,
  clienteDto.telefone,
  clienteDto.email,
  clienteDto.cpfCnpj,
  clienteDto.tipoPessoa,
  'uuid-1',
  new Date(),
  new Date(),
);

describe('UpdateClienteUseCase', () => {
  let repository: ClienteRepositoryMock;
  let useCase: UpdateClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new UpdateClienteUseCase(repository as ClienteRepository);
  });

  it('atualiza cliente com dados validos', async () => {
    repository.getByCpfCnpj.mockResolvedValue(null);
    repository.updateCliente.mockResolvedValue(clienteCriado);

    const result = await useCase.execute('uuid-1', clienteDto);

    expect(result).toBe(clienteCriado);
    expect(repository.updateCliente).toHaveBeenCalledWith(
      'uuid-1',
      expect.objectContaining({
        id: 'uuid-1',
        nome: clienteDto.nome,
        telefone: clienteDto.telefone,
        email: clienteDto.email,
        cpfCnpj: clienteDto.cpfCnpj,
        tipoPessoa: clienteDto.tipoPessoa,
      }),
    );
  });

  it('lanca ConflictException quando CPF/CNPJ ja pertence a outro', async () => {
    repository.getByCpfCnpj.mockResolvedValue({
      ...clienteCriado,
      id: 'outro-uuid',
    });

    await expect(useCase.execute('uuid-1', clienteDto)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.updateCliente).not.toHaveBeenCalled();
  });
});
