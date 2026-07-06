import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AdicionarItemEstoqueOSUseCase } from './adicionar-item-estoque-os.use-case';

const mockOrdemRepo = { findById: jest.fn(), adicionarItemEstoque: jest.fn() };

describe('AdicionarItemEstoqueOSUseCase', () => {
  let useCase: AdicionarItemEstoqueOSUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdicionarItemEstoqueOSUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(AdicionarItemEstoqueOSUseCase);
    jest.clearAllMocks();
  });

  it('adiciona o item quando a OS é mutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    const linha = { id: 'linha-1', itemEstoqueId: 'item-1', quantidade: 2 };
    mockOrdemRepo.adicionarItemEstoque.mockResolvedValue(linha);

    const result = await useCase.execute('ordem-1', {
      itemEstoqueId: 'item-1',
      quantidade: 2,
    });

    expect(result).toBe(linha);
    expect(mockOrdemRepo.adicionarItemEstoque).toHaveBeenCalledWith('ordem-1', {
      itemEstoqueId: 'item-1',
      quantidade: 2,
    });
  });

  it('lança ConflictException quando a OS é imutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_EXECUCAO' });

    await expect(
      useCase.execute('ordem-1', { itemEstoqueId: 'item-1', quantidade: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.adicionarItemEstoque).not.toHaveBeenCalled();
  });
});
