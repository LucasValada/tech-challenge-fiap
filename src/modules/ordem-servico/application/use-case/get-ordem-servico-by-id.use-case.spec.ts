import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetOrdemServicoByIdUseCase } from './get-ordem-servico-by-id.use-case';

const mockOrdemRepo = { findByIdComDetalhes: jest.fn() };

describe('GetOrdemServicoByIdUseCase', () => {
  let useCase: GetOrdemServicoByIdUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrdemServicoByIdUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetOrdemServicoByIdUseCase);
    jest.clearAllMocks();
  });

  it('retorna a OS detalhada quando encontrada', async () => {
    const detalhes = { id: 'ordem-1', codigo: 'OS-2026-000001' };
    mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(detalhes);

    const result = await useCase.execute('ordem-1');

    expect(result).toBe(detalhes);
    expect(mockOrdemRepo.findByIdComDetalhes).toHaveBeenCalledWith('ordem-1');
  });

  it('lança NotFoundException quando não encontrada', async () => {
    mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
