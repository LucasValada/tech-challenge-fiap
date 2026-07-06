import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateOrdemServicoUseCase } from './update-ordem-servico.use-case';

const mockOrdemRepo = { findById: jest.fn(), update: jest.fn() };

describe('UpdateOrdemServicoUseCase', () => {
  let useCase: UpdateOrdemServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOrdemServicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(UpdateOrdemServicoUseCase);
    jest.clearAllMocks();
  });

  it('atualiza as observações quando a OS existe', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ id: 'ordem-1' });
    const atualizada = { id: 'ordem-1', observacoes: 'nova obs' };
    mockOrdemRepo.update.mockResolvedValue(atualizada);

    const result = await useCase.execute('ordem-1', {
      observacoes: 'nova obs',
    });

    expect(result).toBe(atualizada);
    expect(mockOrdemRepo.update).toHaveBeenCalledWith('ordem-1', {
      observacoes: 'nova obs',
    });
  });

  it('lança NotFoundException quando a OS não existe', async () => {
    mockOrdemRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { observacoes: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockOrdemRepo.update).not.toHaveBeenCalled();
  });
});
