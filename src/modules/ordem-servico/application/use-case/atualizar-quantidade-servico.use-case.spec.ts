import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AtualizarQuantidadeServicoUseCase } from './atualizar-quantidade-servico.use-case';

const mockOrdemRepo = {
  findById: jest.fn(),
  atualizarQuantidadeServico: jest.fn(),
};

describe('AtualizarQuantidadeServicoUseCase', () => {
  let useCase: AtualizarQuantidadeServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AtualizarQuantidadeServicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(AtualizarQuantidadeServicoUseCase);
    jest.clearAllMocks();
  });

  it('atualiza a quantidade quando a OS é mutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    const linha = { id: 'linha-1', quantidade: 3 };
    mockOrdemRepo.atualizarQuantidadeServico.mockResolvedValue(linha);

    const result = await useCase.execute('ordem-1', 'linha-1', 3);

    expect(result).toBe(linha);
    expect(mockOrdemRepo.atualizarQuantidadeServico).toHaveBeenCalledWith(
      'ordem-1',
      'linha-1',
      3,
    );
  });

  it('lança ConflictException quando a OS é imutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_EXECUCAO' });

    await expect(
      useCase.execute('ordem-1', 'linha-1', 3),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.atualizarQuantidadeServico).not.toHaveBeenCalled();
  });
});
