import { BadRequestException, ConflictException } from '@nestjs/common';
import { ClientPolicyService } from '../domain/service/ClientPolicy.service';
import { Cliente } from '../domain/entity/Client';

const mockRepository = {
  getOne: jest.fn(),
  getAllClient: jest.fn(),
  createClient: jest.fn(),
  getByCpfCnpj: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
};

describe('ClientPolicyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não lança erro para cliente válido e CPF/CNPJ não existente', async () => {
    const cliente = new Cliente('João', null, 'joao@email.com', '123.456.789-00', 'FISICA');
    mockRepository.getByCpfCnpj.mockResolvedValue(null);

    const policy = new ClientPolicyService(mockRepository, cliente);

    await expect(policy.validateClient()).resolves.toBeUndefined();
  });

  it('lança BadRequestException para CPF inválido', async () => {
    const cliente = new Cliente('João', null, null, 'invalido', 'FISICA');
    const policy = new ClientPolicyService(mockRepository, cliente);

    await expect(policy.validateClient()).rejects.toThrow(BadRequestException);
  });

  it('lança BadRequestException para email inválido', async () => {
    const cliente = new Cliente('João', null, 'email-invalido', '123.456.789-00', 'FISICA');
    const policy = new ClientPolicyService(mockRepository, cliente);

    await expect(policy.validateClient()).rejects.toThrow(BadRequestException);
  });

  it('lança ConflictException quando CPF/CNPJ já existe', async () => {
    const cliente = new Cliente('João', null, null, '123.456.789-00', 'FISICA');
    mockRepository.getByCpfCnpj.mockResolvedValue({ id: 'outro' });
    const policy = new ClientPolicyService(mockRepository, cliente);

    await expect(policy.validateClient()).rejects.toThrow(ConflictException);
  });

  it('permite email null sem validar', async () => {
    const cliente = new Cliente('João', null, null, '123.456.789-00', 'FISICA');
    mockRepository.getByCpfCnpj.mockResolvedValue(null);
    const policy = new ClientPolicyService(mockRepository, cliente);

    await expect(policy.validateClient()).resolves.toBeUndefined();
  });

  it('passa excludeId para getByCpfCnpj no update', async () => {
    const cliente = new Cliente('João', null, null, '123.456.789-00', 'FISICA', 'uuid-1');
    mockRepository.getByCpfCnpj.mockResolvedValue(null);
    const policy = new ClientPolicyService(mockRepository, cliente);

    await policy.validateClient('uuid-1');

    expect(mockRepository.getByCpfCnpj).toHaveBeenCalledWith(
      '123.456.789-00',
      'uuid-1',
    );
  });
});
