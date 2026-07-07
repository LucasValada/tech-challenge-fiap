import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateClienteUseCase } from './update-cliente.use-case';

const CLIENTE_ID = 'cliente-uuid';
const CPF_ATUAL = '52998224725';
const CPF_NOVO = '39053344705';

const clienteMock = {
  id: CLIENTE_ID,
  nome: 'João Silva',
  telefone: '11999999999',
  email: 'joao@teste.com',
  cpfCnpj: CPF_ATUAL,
  tipoPessoa: 'FISICA' as const,
};

const mockRepo = {
  findById: jest.fn(),
  findByCpfCnpj: jest.fn(),
  update: jest.fn(),
};

describe('UpdateClienteUseCase', () => {
  let useCase: UpdateClienteUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateClienteUseCase,
        { provide: 'CLIENTE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(UpdateClienteUseCase);
    jest.clearAllMocks();
  });

  it('atualiza cliente existente sem validar CPF/CNPJ quando ele não vem no payload', async () => {
    const dto = { nome: 'João Atualizado' };
    const atualizado = { ...clienteMock, nome: 'João Atualizado' };
    mockRepo.findById.mockResolvedValue(clienteMock);
    mockRepo.update.mockResolvedValue(atualizado);

    const result = await useCase.execute(CLIENTE_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockRepo.findByCpfCnpj).not.toHaveBeenCalled();
    expect(mockRepo.update).toHaveBeenCalledWith(CLIENTE_ID, dto);
  });

  it('valida CPF/CNPJ único quando ele vem no payload', async () => {
    const dto = { cpfCnpj: CPF_NOVO };
    mockRepo.findById.mockResolvedValue(clienteMock);
    mockRepo.findByCpfCnpj.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ ...clienteMock, cpfCnpj: CPF_NOVO });

    await useCase.execute(CLIENTE_ID, dto);

    expect(mockRepo.findByCpfCnpj).toHaveBeenCalledWith(CPF_NOVO, CLIENTE_ID);
  });

  it('lança NotFoundException quando o cliente não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { nome: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('lança ConflictException quando CPF/CNPJ pertence a outro cliente', async () => {
    mockRepo.findById.mockResolvedValue(clienteMock);
    mockRepo.findByCpfCnpj.mockResolvedValue({
      ...clienteMock,
      id: 'outro-uuid',
    });

    await expect(
      useCase.execute(CLIENTE_ID, { cpfCnpj: CPF_NOVO }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
