import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateClienteUseCase } from '../application/use-case/createCliente.use-case';
import { DeleteClientUseCase } from '../application/use-case/deleteCliente.use-case';
import { GetAllClientServices } from '../application/use-case/getAllCliente.use-case';
import { GetOneClienteUseCase } from '../application/use-case/getOnecliente.use-case';
import { UpdateClienteUseCase } from '../application/use-case/updateCliente.use-case';

const mockClientRepository = {
  getOne: jest.fn(),
  getAllClient: jest.fn(),
  createClient: jest.fn(),
  getByCpfCnpj: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
};

const clienteDto = {
  nome: 'João da Silva',
  telefone: '(11)999999999',
  email: 'joao@email.com',
  cpfCnpj: '529.982.247-25',
  tipoPessoa: 'FISICA' as const,
};

const clienteCriado = {
  ...clienteDto,
  id: 'uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('clientServices', () => {
  let service_getAllClient: GetAllClientServices;
  let service_getOneClient: GetOneClienteUseCase;
  let service_createClient: CreateClienteUseCase;
  let service_updateClient: UpdateClienteUseCase;
  let service_deleteClient: DeleteClientUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateClienteUseCase,
        DeleteClientUseCase,
        GetAllClientServices,
        GetOneClienteUseCase,
        UpdateClienteUseCase,
        { provide: 'CLIENT_REPOSITORY', useValue: mockClientRepository },
      ],
    }).compile();

    service_getAllClient = moduleRef.get(GetAllClientServices);
    service_getOneClient = moduleRef.get(GetOneClienteUseCase);
    service_createClient = moduleRef.get(CreateClienteUseCase);
    service_updateClient = moduleRef.get(UpdateClienteUseCase);
    service_deleteClient = moduleRef.get(DeleteClientUseCase);
    jest.clearAllMocks();
  });

  describe('getAllClient', () => {
    it('retorna lista de clientes', async () => {
      const resultado = { client: [clienteCriado], count: 1 };
      mockClientRepository.getAllClient.mockResolvedValue(resultado);

      const result = await service_getAllClient.execute();

      expect(result).toBe(resultado);
    });
  });

  describe('getOneClient', () => {
    it('retorna cliente quando encontrado', async () => {
      mockClientRepository.getOne.mockResolvedValue(clienteCriado);

      const result = await service_getOneClient.execute('uuid-1');

      expect(result).toBe(clienteCriado);
    });

    it('lança NotFoundException quando não encontrado', async () => {
      mockClientRepository.getOne.mockResolvedValue(null);

      await expect(
        service_getOneClient.execute('uuid-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createClient', () => {
    it('cria cliente com dados válidos', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue(null);
      mockClientRepository.createClient.mockResolvedValue(clienteCriado);

      const result = await service_createClient.execute(clienteDto);

      expect(result).toBe(clienteCriado);
      expect(mockClientRepository.createClient).toHaveBeenCalled();
    });

    it('lança ConflictException quando CPF/CNPJ já existe', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue(clienteCriado);

      await expect(service_createClient.execute(clienteDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockClientRepository.createClient).not.toHaveBeenCalled();
    });

    it('lança BadRequestException para email inválido', async () => {
      const dtoInvalido = { ...clienteDto, email: 'email-invalido' };

      await expect(service_createClient.execute(dtoInvalido)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateClient', () => {
    it('atualiza cliente com dados válidos', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue(null);
      mockClientRepository.updateClient.mockResolvedValue(clienteCriado);

      const result = await service_updateClient.execute('uuid-1', clienteDto);

      expect(result).toBe(clienteCriado);
    });

    it('lança ConflictException quando CPF/CNPJ já pertence a outro', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue({
        ...clienteCriado,
        id: 'outro-uuid',
      });

      await expect(
        service_updateClient.execute('uuid-1', clienteDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteClient', () => {
    it('deleta cliente', async () => {
      mockClientRepository.deleteClient.mockResolvedValue(undefined);

      await service_deleteClient.execute('uuid-1');

      expect(mockClientRepository.deleteClient).toHaveBeenCalledWith('uuid-1');
    });
  });
});
