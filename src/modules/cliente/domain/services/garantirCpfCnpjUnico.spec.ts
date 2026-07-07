import { ConflictException } from '@nestjs/common';
import { garantirCpfCnpjUnico } from './garantirCpfCnpjUnico';

const CPF_NOVO = '52998224725';
const CPF_EXISTENTE = '39053344705';
const CLIENTE_ID = 'cliente-uuid-1';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCpfCnpj: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('garantirCpfCnpjUnico', () => {
  beforeEach(() => jest.clearAllMocks());

  it('não lança quando CPF/CNPJ não existe', async () => {
    mockRepo.findByCpfCnpj.mockResolvedValue(null);

    await expect(
      garantirCpfCnpjUnico(mockRepo, CPF_NOVO),
    ).resolves.toBeUndefined();
    expect(mockRepo.findByCpfCnpj).toHaveBeenCalledWith(CPF_NOVO, undefined);
  });

  it('lança ConflictException quando CPF/CNPJ já existe', async () => {
    mockRepo.findByCpfCnpj.mockResolvedValue({ id: 'outro' });

    await expect(
      garantirCpfCnpjUnico(mockRepo, CPF_EXISTENTE),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga excludeId para o repositório no cenário de update', async () => {
    mockRepo.findByCpfCnpj.mockResolvedValue(null);

    await garantirCpfCnpjUnico(mockRepo, CPF_EXISTENTE, CLIENTE_ID);

    expect(mockRepo.findByCpfCnpj).toHaveBeenCalledWith(
      CPF_EXISTENTE,
      CLIENTE_ID,
    );
  });
});
