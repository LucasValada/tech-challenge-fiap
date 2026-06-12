import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WebhookOrcamentoService } from './webhook-orcamento.service';
import { ORDEM_SERVICO_REPOSITORY } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';

const mockRepo = {
  findByCodigo: jest.fn(),
  transicionarStatus: jest.fn(),
};

const ordemAguardando = (): OrdemServico => ({
  id: 'ordem-uuid-1',
  codigo: 'OS-2026-000001',
  clienteId: 'cliente-1',
  veiculoId: 'veiculo-1',
  usuarioCriadorId: 'usuario-1',
  status: 'AGUARDANDO_APROVACAO',
  observacoes: null,
  valorServicos: 100,
  valorPecas: 50,
  valorTotal: 150,
});

describe('WebhookOrcamentoService', () => {
  let service: WebhookOrcamentoService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookOrcamentoService,
        { provide: ORDEM_SERVICO_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = moduleRef.get(WebhookOrcamentoService);
    jest.clearAllMocks();
  });

  describe('aprovação', () => {
    it('transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO como AVANCO', async () => {
      const ordem = ordemAguardando();
      mockRepo.findByCodigo.mockResolvedValue(ordem);
      mockRepo.transicionarStatus.mockResolvedValue({
        ...ordem,
        status: 'EM_EXECUCAO',
      });

      const result = await service.processarDecisao({
        codigoOS: 'OS-2026-000001',
        aprovado: true,
      });

      expect(mockRepo.transicionarStatus).toHaveBeenCalledWith(
        'ordem-uuid-1',
        'EM_EXECUCAO',
        'AVANCO',
        'usuario-1',
        'Orçamento aprovado via webhook externo',
      );
      expect(result).toEqual({
        codigo: 'OS-2026-000001',
        status: 'EM_EXECUCAO',
      });
    });
  });

  describe('recusa', () => {
    it('transiciona AGUARDANDO_APROVACAO → EM_DIAGNOSTICO como ROLLBACK', async () => {
      const ordem = ordemAguardando();
      mockRepo.findByCodigo.mockResolvedValue(ordem);
      mockRepo.transicionarStatus.mockResolvedValue({
        ...ordem,
        status: 'EM_DIAGNOSTICO',
      });

      const result = await service.processarDecisao({
        codigoOS: 'OS-2026-000001',
        aprovado: false,
      });

      expect(mockRepo.transicionarStatus).toHaveBeenCalledWith(
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
  });

  describe('erros', () => {
    it('lança NotFoundException quando OS não existe', async () => {
      mockRepo.findByCodigo.mockResolvedValue(null);

      await expect(
        service.processarDecisao({
          codigoOS: 'OS-2026-999999',
          aprovado: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança ConflictException quando OS não está em AGUARDANDO_APROVACAO', async () => {
      const ordem = ordemAguardando();
      ordem.status = 'EM_EXECUCAO';
      mockRepo.findByCodigo.mockResolvedValue(ordem);

      await expect(
        service.processarDecisao({
          codigoOS: 'OS-2026-000001',
          aprovado: true,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockRepo.transicionarStatus).not.toHaveBeenCalled();
    });
  });
});
