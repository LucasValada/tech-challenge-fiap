import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AtualizarQuantidadeItemEstoqueUseCase } from './atualizar-quantidade-item-estoque.use-case';

const mockOrdemRepo = {
  findById: jest.fn(),
  atualizarQuantidadeItemEstoque: jest.fn(),
};

describe('AtualizarQuantidadeItemEstoqueUseCase', () => {
  let useCase: AtualizarQuantidadeItemEstoqueUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AtualizarQuantidadeItemEstoqueUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(AtualizarQuantidadeItemEstoqueUseCase);
    jest.clearAllMocks();
  });

  it('atualiza a quantidade quando a OS é mutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    const linha = { id: 'linha-1', quantidade: 5 };
    mockOrdemRepo.atualizarQuantidadeItemEstoque.mockResolvedValue(linha);

    const result = await useCase.execute('ordem-1', 'linha-1', 5);

    expect(result).toBe(linha);
    expect(mockOrdemRepo.atualizarQuantidadeItemEstoque).toHaveBeenCalledWith(
      'ordem-1',
      'linha-1',
      5,
    );
  });

  it('lança ConflictException quando a OS é imutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_EXECUCAO' });

    await expect(
      useCase.execute('ordem-1', 'linha-1', 5),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.atualizarQuantidadeItemEstoque).not.toHaveBeenCalled();
  });
});
