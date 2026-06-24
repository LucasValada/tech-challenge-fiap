import { ConflictException } from '@nestjs/common';
import { UpdateClienteUseCase } from '../application/use-case/updateCliente.use-case';
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

describe('UpdateClienteUseCase', () => {
  let repository: ClientRepositoryMock;
  let useCase: UpdateClienteUseCase;

  beforeEach(() => {
    repository = createRepositoryMock();
    useCase = new UpdateClienteUseCase(repository as ClientRepository);
  });

  it('atualiza cliente com dados validos', async () => {
    repository.getByCpfCnpj.mockResolvedValue(null);
    repository.updateClient.mockResolvedValue(clienteCriado);

    const result = await useCase.execute('uuid-1', clienteDto);

    expect(result).toBe(clienteCriado);
    expect(repository.updateClient).toHaveBeenCalledWith(
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
    expect(repository.updateClient).not.toHaveBeenCalled();
  });
});
