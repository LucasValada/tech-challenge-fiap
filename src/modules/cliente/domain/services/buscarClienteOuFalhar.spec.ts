import { NotFoundException } from '@nestjs/common';
import { buscarClienteOuFalhar } from './buscarClienteOuFalhar';

const CLIENTE_ID = 'cliente-uuid-1';

const clienteMock = {
  id: CLIENTE_ID,
  nome: 'João Silva',
  telefone: '11999999999',
  email: 'joao@teste.com',
  cpfCnpj: '52998224725',
  tipoPessoa: 'FISICA' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCpfCnpj: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('buscarClienteOuFalhar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna o cliente quando encontrado', async () => {
    mockRepo.findById.mockResolvedValue(clienteMock);

    const result = await buscarClienteOuFalhar(mockRepo, CLIENTE_ID);

    expect(result).toBe(clienteMock);
    expect(mockRepo.findById).toHaveBeenCalledWith(CLIENTE_ID);
  });

  it('lança NotFoundException quando o cliente não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      buscarClienteOuFalhar(mockRepo, 'inexistente'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
