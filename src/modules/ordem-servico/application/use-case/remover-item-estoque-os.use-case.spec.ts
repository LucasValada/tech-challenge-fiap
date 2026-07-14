import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RemoverItemEstoqueOSUseCase } from './remover-item-estoque-os.use-case';

const mockOrdemRepo = { findById: jest.fn(), removerItemEstoque: jest.fn() };

describe('RemoverItemEstoqueOSUseCase', () => {
  let useCase: RemoverItemEstoqueOSUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RemoverItemEstoqueOSUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(RemoverItemEstoqueOSUseCase);
    jest.clearAllMocks();
  });

  it('remove o item quando a OS é mutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    mockOrdemRepo.removerItemEstoque.mockResolvedValue(undefined);

    await useCase.execute('ordem-1', 'linha-1');

    expect(mockOrdemRepo.removerItemEstoque).toHaveBeenCalledWith(
      'ordem-1',
      'linha-1',
    );
  });

  it('lança ConflictException quando a OS é imutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_EXECUCAO' });

    await expect(useCase.execute('ordem-1', 'linha-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mockOrdemRepo.removerItemEstoque).not.toHaveBeenCalled();
  });
});
