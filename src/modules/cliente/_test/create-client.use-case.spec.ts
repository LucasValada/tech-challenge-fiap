import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { clientServices } from '../application/use-case/cliente.use-case';

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
  cpfCnpj: '123.456.789-00',
  tipoPessoa: 'FISICA' as const,
};

const clienteCriado = {
  ...clienteDto,
  id: 'uuid-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('clientServices', () => {
  let service: clientServices;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        clientServices,
        { provide: 'CLIENT_REPOSITORY', useValue: mockClientRepository },
      ],
    }).compile();

    service = moduleRef.get(clientServices);
    jest.clearAllMocks();
  });

  describe('getAllClient', () => {
    it('retorna lista de clientes', async () => {
      const resultado = { client: [clienteCriado], count: 1 };
      mockClientRepository.getAllClient.mockResolvedValue(resultado);

      const result = await service.getAllClient();

      expect(result).toBe(resultado);
    });
  });

  describe('getOneClient', () => {
    it('retorna cliente quando encontrado', async () => {
      mockClientRepository.getOne.mockResolvedValue(clienteCriado);

      const result = await service.getOneClient('uuid-1');

      expect(result).toBe(clienteCriado);
    });

    it('lança NotFoundException quando não encontrado', async () => {
      mockClientRepository.getOne.mockResolvedValue(null);

      await expect(service.getOneClient('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createClient', () => {
    it('cria cliente com dados válidos', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue(null);
      mockClientRepository.createClient.mockResolvedValue(clienteCriado);

      const result = await service.createClient(clienteDto);

      expect(result).toBe(clienteCriado);
      expect(mockClientRepository.createClient).toHaveBeenCalled();
    });

    it('lança BadRequestException para CPF inválido', async () => {
      const dtoInvalido = { ...clienteDto, cpfCnpj: '000' };

      await expect(service.createClient(dtoInvalido)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockClientRepository.createClient).not.toHaveBeenCalled();
    });

    it('lança ConflictException quando CPF/CNPJ já existe', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue(clienteCriado);

      await expect(service.createClient(clienteDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockClientRepository.createClient).not.toHaveBeenCalled();
    });

    it('lança BadRequestException para email inválido', async () => {
      const dtoInvalido = { ...clienteDto, email: 'email-invalido' };

      await expect(service.createClient(dtoInvalido)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateClient', () => {
    it('atualiza cliente com dados válidos', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue(null);
      mockClientRepository.updateClient.mockResolvedValue(clienteCriado);

      const result = await service.updateClient('uuid-1', clienteDto);

      expect(result).toBe(clienteCriado);
    });

    it('lança ConflictException quando CPF/CNPJ já pertence a outro', async () => {
      mockClientRepository.getByCpfCnpj.mockResolvedValue({
        ...clienteCriado,
        id: 'outro-uuid',
      });

      await expect(service.updateClient('uuid-1', clienteDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteClient', () => {
    it('deleta cliente', async () => {
      mockClientRepository.deleteClient.mockResolvedValue(undefined);

      await service.deleteClient('uuid-1');

      expect(mockClientRepository.deleteClient).toHaveBeenCalledWith('uuid-1');
    });
  });
});
