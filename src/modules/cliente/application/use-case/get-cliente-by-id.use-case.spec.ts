import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetClienteByIdUseCase } from './get-cliente-by-id.use-case';

const CLIENTE_ID = 'cliente-uuid';

const clienteMock = {
  id: CLIENTE_ID,
  nome: 'João Silva',
  telefone: '11999999999',
  email: 'joao@teste.com',
  cpfCnpj: '52998224725',
  tipoPessoa: 'FISICA' as const,
};

const mockRepo = { findById: jest.fn() };

describe('GetClienteByIdUseCase', () => {
  let useCase: GetClienteByIdUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetClienteByIdUseCase,
        { provide: 'CLIENTE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetClienteByIdUseCase);
    jest.clearAllMocks();
  });

  it('retorna o cliente quando encontrado', async () => {
    mockRepo.findById.mockResolvedValue(clienteMock);

    const result = await useCase.execute(CLIENTE_ID);

    expect(result).toBe(clienteMock);
    expect(mockRepo.findById).toHaveBeenCalledWith(CLIENTE_ID);
  });

  it('lança NotFoundException quando o cliente não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
