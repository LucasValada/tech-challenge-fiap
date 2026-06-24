import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateClienteUseCase } from '../application/use-case/createCliente.use-case';
import { ClientDto } from '../application/dto/client.dto';
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

const clienteDto: ClientDto = {
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
  let repository: ClientRepositoryMock;
  let useCase: CreateClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new CreateClienteUseCase(repository as ClientRepository);
  });

  it('cria cliente com dados validos', async () => {
    repository.getByCpfCnpj.mockResolvedValue(null);
    repository.createClient.mockResolvedValue(clienteCriado);

    const result = await useCase.execute(clienteDto);

    expect(result).toBe(clienteCriado);
    expect(repository.createClient).toHaveBeenCalledWith(
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
    expect(repository.createClient).not.toHaveBeenCalled();
  });

  it('lanca BadRequestException para email invalido', async () => {
    const dtoInvalido = { ...clienteDto, email: 'email-invalido' };

    await expect(useCase.execute(dtoInvalido)).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.createClient).not.toHaveBeenCalled();
  });
});
