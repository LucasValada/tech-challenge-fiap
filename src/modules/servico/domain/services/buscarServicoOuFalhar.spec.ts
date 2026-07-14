import { NotFoundException } from '@nestjs/common';
import { buscarServicoOuFalhar } from './buscarServicoOuFalhar';

const SERVICO_ID = 'servico-uuid-1';

const servicoMock = {
  id: SERVICO_ID,
  nome: 'Troca de óleo',
  descricao: null,
  precoBase: 150,
  tempoEstimadoMin: 45,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('buscarServicoOuFalhar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna o serviço quando encontrado', async () => {
    mockRepo.findById.mockResolvedValue(servicoMock);

    const result = await buscarServicoOuFalhar(mockRepo, SERVICO_ID);

    expect(result).toBe(servicoMock);
    expect(mockRepo.findById).toHaveBeenCalledWith(SERVICO_ID);
  });

  it('lança NotFoundException quando o serviço não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      buscarServicoOuFalhar(mockRepo, 'inexistente'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
