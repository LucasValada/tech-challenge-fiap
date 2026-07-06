import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProcessarWebhookOrcamentoUseCase } from './processar-webhook-orcamento.use-case';

const mockOrdemRepo = {
  findByCodigo: jest.fn(),
  transicionarStatus: jest.fn(),
};

const ordemAguardando = () => ({
  id: 'ordem-uuid-1',
  codigo: 'OS-2026-000001',
  usuarioCriadorId: 'usuario-1',
  status: 'AGUARDANDO_APROVACAO',
});

describe('ProcessarWebhookOrcamentoUseCase', () => {
  let useCase: ProcessarWebhookOrcamentoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessarWebhookOrcamentoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(ProcessarWebhookOrcamentoUseCase);
    jest.clearAllMocks();
  });

  it('aprovação transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO como AVANCO', async () => {
    const ordem = ordemAguardando();
    mockOrdemRepo.findByCodigo.mockResolvedValue(ordem);
    mockOrdemRepo.transicionarStatus.mockResolvedValue({
      ...ordem,
      status: 'EM_EXECUCAO',
    });

    const result = await useCase.execute({
      codigoOS: 'OS-2026-000001',
      aprovado: true,
    });

    expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
      'ordem-uuid-1',
      'EM_EXECUCAO',
      'AVANCO',
      'usuario-1',
      'Orçamento aprovado via webhook externo',
    );
    expect(result).toEqual({ codigo: 'OS-2026-000001', status: 'EM_EXECUCAO' });
  });

  it('recusa transiciona AGUARDANDO_APROVACAO → EM_DIAGNOSTICO como ROLLBACK', async () => {
    const ordem = ordemAguardando();
    mockOrdemRepo.findByCodigo.mockResolvedValue(ordem);
    mockOrdemRepo.transicionarStatus.mockResolvedValue({
      ...ordem,
      status: 'EM_DIAGNOSTICO',
    });

    const result = await useCase.execute({
      codigoOS: 'OS-2026-000001',
      aprovado: false,
    });

    expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
      'ordem-uuid-1',
      'EM_DIAGNOSTICO',
      'ROLLBACK',
      'usuario-1',
      'Orçamento recusado via webhook externo',
    );
    expect(result).toEqual({
      codigo: 'OS-2026-000001',
      status: 'EM_DIAGNOSTICO',
    });
  });

  it('lança NotFoundException quando a OS não existe', async () => {
    mockOrdemRepo.findByCodigo.mockResolvedValue(null);

    await expect(
      useCase.execute({ codigoOS: 'OS-2026-999999', aprovado: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança ConflictException quando a OS não está em AGUARDANDO_APROVACAO', async () => {
    const ordem = ordemAguardando();
    ordem.status = 'EM_EXECUCAO';
    mockOrdemRepo.findByCodigo.mockResolvedValue(ordem);

    await expect(
      useCase.execute({ codigoOS: 'OS-2026-000001', aprovado: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
  });
});
