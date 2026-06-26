import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateClienteUseCase } from './createCliente.use-case';
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

describe('CreateClienteUseCase', () => {
  let repository: ClienteRepositoryMock;
  let useCase: CreateClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new CreateClienteUseCase(repository as ClienteRepository);
  });

  it('cria cliente com dados validos', async () => {
    repository.getByCpfCnpj.mockResolvedValue(null);
    repository.createCliente.mockResolvedValue(clienteCriado);

    const result = await useCase.execute(clienteDto);

    expect(result).toBe(clienteCriado);
    expect(repository.createCliente).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: clienteDto.nome,
        telefone: clienteDto.telefone,
        email: clienteDto.email,
        cpfCnpj: clienteDto.cpfCnpj,
        tipoPessoa: clienteDto.tipoPessoa,
      }),
    );
  });

  it('lanca ConflictException quando CPF/CNPJ ja existe', async () => {
    repository.getByCpfCnpj.mockResolvedValue(clienteCriado);

    await expect(useCase.execute(clienteDto)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.createCliente).not.toHaveBeenCalled();
  });

  it('lanca BadRequestException para email invalido', async () => {
    const dtoInvalido = { ...clienteDto, email: 'email-invalido' };

    await expect(useCase.execute(dtoInvalido)).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.createCliente).not.toHaveBeenCalled();
  });
});
