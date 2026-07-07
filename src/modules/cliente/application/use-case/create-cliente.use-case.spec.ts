import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateClienteUseCase } from './create-cliente.use-case';

const CPF_NOVO = '52998224725';
const CPF_EXISTENTE = '39053344705';

const dto = {
  nome: 'João Silva',
  telefone: '11999999999',
  email: 'joao@teste.com',
  cpfCnpj: CPF_NOVO,
  tipoPessoa: 'FISICA' as const,
};

const clienteMock = { id: 'cliente-uuid', ...dto };

const mockRepo = {
  create: jest.fn(),
  findByCpfCnpj: jest.fn(),
};

describe('CreateClienteUseCase', () => {
  let useCase: CreateClienteUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateClienteUseCase,
        { provide: 'CLIENTE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(CreateClienteUseCase);
    jest.clearAllMocks();
  });

  it('cria cliente quando CPF/CNPJ não existe', async () => {
    mockRepo.findByCpfCnpj.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(clienteMock);

    const result = await useCase.execute(dto);

    expect(result).toBe(clienteMock);
    expect(mockRepo.findByCpfCnpj).toHaveBeenCalledWith(CPF_NOVO, undefined);
    expect(mockRepo.create).toHaveBeenCalledWith(dto);
  });

  it('lança ConflictException quando CPF/CNPJ já existe', async () => {
    mockRepo.findByCpfCnpj.mockResolvedValue(clienteMock);

    await expect(
      useCase.execute({ ...dto, cpfCnpj: CPF_EXISTENTE }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('normaliza telefone e email null quando ausentes', async () => {
    mockRepo.findByCpfCnpj.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(clienteMock);

    await useCase.execute({
      nome: 'Só nome',
      cpfCnpj: CPF_NOVO,
      tipoPessoa: 'FISICA',
    } as never);

    expect(mockRepo.create).toHaveBeenCalledWith({
      nome: 'Só nome',
      telefone: null,
      email: null,
      cpfCnpj: CPF_NOVO,
      tipoPessoa: 'FISICA',
    });
  });
});
