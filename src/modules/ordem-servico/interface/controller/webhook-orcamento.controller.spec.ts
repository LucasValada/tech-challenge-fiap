import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WebhookOrcamentoController } from './webhook-orcamento.controller';
import { ProcessarWebhookOrcamentoUseCase } from '../../application/use-case/processar-webhook-orcamento.use-case';
import { WebhookTokenGuard } from '../../../../common/guards';

const CODIGO_OS = 'OS-2026-000001';

const mockProcessarWebhook = { execute: jest.fn() };

describe('WebhookOrcamentoController', () => {
  let controller: WebhookOrcamentoController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [WebhookOrcamentoController],
      providers: [
        {
          provide: ProcessarWebhookOrcamentoUseCase,
          useValue: mockProcessarWebhook,
        },
      ],
    })
      .overrideGuard(WebhookTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(WebhookOrcamentoController);
    jest.clearAllMocks();
  });

  it('delega para ProcessarWebhookOrcamentoUseCase com o DTO (aprovado=true)', async () => {
    const dto = { codigoOS: CODIGO_OS, aprovado: true };
    const resp = { codigo: CODIGO_OS, status: 'EM_EXECUCAO' as const };
    mockProcessarWebhook.execute.mockResolvedValue(resp);

    const result = await controller.receber(dto);

    expect(result).toBe(resp);
    expect(mockProcessarWebhook.execute).toHaveBeenCalledWith(dto);
  });

  it('delega para ProcessarWebhookOrcamentoUseCase com o DTO (aprovado=false)', async () => {
    const dto = { codigoOS: CODIGO_OS, aprovado: false };
    const resp = { codigo: CODIGO_OS, status: 'EM_DIAGNOSTICO' as const };
    mockProcessarWebhook.execute.mockResolvedValue(resp);

    const result = await controller.receber(dto);

    expect(result).toBe(resp);
    expect(mockProcessarWebhook.execute).toHaveBeenCalledWith(dto);
  });

  it('propaga NotFoundException do use case quando OS não existe', async () => {
    mockProcessarWebhook.execute.mockRejectedValue(
      new NotFoundException('Ordem de serviço não encontrada'),
    );

    await expect(
      controller.receber({ codigoOS: 'OS-9999-999999', aprovado: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propaga ConflictException quando status inválido pra aprovação', async () => {
    mockProcessarWebhook.execute.mockRejectedValue(
      new ConflictException('OS não está em AGUARDANDO_APROVACAO'),
    );

    await expect(
      controller.receber({ codigoOS: CODIGO_OS, aprovado: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
