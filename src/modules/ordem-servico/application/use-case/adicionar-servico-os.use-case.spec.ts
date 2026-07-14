import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AdicionarServicoOSUseCase } from './adicionar-servico-os.use-case';
import { EstoqueInsuficienteError } from '../../domain/errors';

const mockOrdemRepo = { findById: jest.fn(), adicionarServico: jest.fn() };

describe('AdicionarServicoOSUseCase', () => {
  let useCase: AdicionarServicoOSUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdicionarServicoOSUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(AdicionarServicoOSUseCase);
    jest.clearAllMocks();
  });

  it('adiciona serviço quando a OS é mutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    const linha = { id: 'linha-1', servicoId: 'svc-1', quantidade: 1 };
    mockOrdemRepo.adicionarServico.mockResolvedValue(linha);

    const result = await useCase.execute('ordem-1', {
      servicoId: 'svc-1',
      quantidade: 1,
    });

    expect(result).toBe(linha);
    expect(mockOrdemRepo.adicionarServico).toHaveBeenCalledWith('ordem-1', {
      servicoId: 'svc-1',
      quantidade: 1,
    });
  });

  it('lança ConflictException quando a OS é imutável (EM_EXECUCAO)', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_EXECUCAO' });

    await expect(
      useCase.execute('ordem-1', { servicoId: 'svc-1', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.adicionarServico).not.toHaveBeenCalled();
  });

  it('traduz erro de domínio lançado pelo repositório', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    mockOrdemRepo.adicionarServico.mockRejectedValue(
      new EstoqueInsuficienteError('Pastilha', 1, 5),
    );

    await expect(
      useCase.execute('ordem-1', { servicoId: 'svc-1', quantidade: 1 }),
    ).rejects.toThrow();
  });
});
