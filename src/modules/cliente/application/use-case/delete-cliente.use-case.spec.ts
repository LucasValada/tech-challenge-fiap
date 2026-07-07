import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteClienteUseCase } from './delete-cliente.use-case';

const CLIENTE_ID = 'cliente-uuid';

const clienteMock = {
  id: CLIENTE_ID,
  nome: 'João Silva',
  telefone: '11999999999',
  email: 'joao@teste.com',
  cpfCnpj: '52998224725',
  tipoPessoa: 'FISICA' as const,
};

const mockRepo = {
  findById: jest.fn(),
  delete: jest.fn(),
};

describe('DeleteClienteUseCase', () => {
  let useCase: DeleteClienteUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteClienteUseCase,
        { provide: 'CLIENTE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteClienteUseCase);
    jest.clearAllMocks();
  });

  it('deleta o cliente quando existe', async () => {
    mockRepo.findById.mockResolvedValue(clienteMock);
    mockRepo.delete.mockResolvedValue(clienteMock);

    await useCase.execute(CLIENTE_ID);

    expect(mockRepo.delete).toHaveBeenCalledWith(CLIENTE_ID);
  });

  it('lança NotFoundException quando o cliente não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
