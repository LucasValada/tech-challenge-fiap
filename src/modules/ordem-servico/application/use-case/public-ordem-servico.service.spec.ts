import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PublicOrdemServicoService } from './public-ordem-servico.service';
import { ORDEM_SERVICO_REPOSITORY } from '../../domain/repository/ordem-servico.repository';
import { OrdemServico } from '../../domain/entity/OrdemServico';

const mockOrdemRepo = {
  findPublicByCodigoEPlaca: jest.fn(),
  findByCodigoEPlaca: jest.fn(),
  transicionarStatus: jest.fn(),
};

const publicView = {
  codigo: 'OS-2026-000001',
  status: 'AGUARDANDO_APROVACAO',
  observacoes: null,
  valorServicos: 100,
  valorPecas: 50,
  valorTotal: 150,
  createdAt: new Date(),
  finalizadaAt: null,
  entregueAt: null,
  cliente: { nome: 'João' },
  veiculo: { placa: 'ABC1D23', marca: 'VW', modelo: 'Gol', ano: 2020 },
  servicos: [],
  itens: [],
  historicoStatus: [],
};

describe('PublicOrdemServicoService', () => {
  let service: PublicOrdemServicoService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PublicOrdemServicoService,
        { provide: ORDEM_SERVICO_REPOSITORY, useValue: mockOrdemRepo },
      ],
    }).compile();

    service = moduleRef.get(PublicOrdemServicoService);
    jest.clearAllMocks();
  });

  describe('consultar', () => {
    it('retorna OS quando encontrada', async () => {
      mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue(publicView);

      const result = await service.consultar('OS-2026-000001', 'ABC1D23');

      expect(result).toBe(publicView);
      expect(mockOrdemRepo.findPublicByCodigoEPlaca).toHaveBeenCalledWith(
        'OS-2026-000001',
        'ABC1D23',
      );
    });

    it('normaliza código e placa', async () => {
      mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue(publicView);

      await service.consultar(' os-2026-000001 ', ' abc1d23 ');

      expect(mockOrdemRepo.findPublicByCodigoEPlaca).toHaveBeenCalledWith(
        'OS-2026-000001',
        'ABC1D23',
      );
    });

    it('lança NotFoundException quando OS não encontrada', async () => {
      mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue(null);

      await expect(
        service.consultar('OS-INEXISTENTE', 'XYZ9999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('aprovarOrcamento', () => {
    it('aprova quando OS está em AGUARDANDO_APROVACAO', async () => {
      const ordem = new OrdemServico(
        'cliente-1',
        'veiculo-1',
        'usuario-1',
        'AGUARDANDO_APROVACAO',
        null,
        100,
        50,
        150,
        'OS-2026-000001',
        'ordem-1',
      );
      mockOrdemRepo.findByCodigoEPlaca.mockResolvedValue(ordem);
      mockOrdemRepo.transicionarStatus.mockResolvedValue({
        ...ordem,
        status: 'EM_EXECUCAO',
      });
      const viewAtualizada = { ...publicView, status: 'EM_EXECUCAO' };
      mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue(viewAtualizada);

      const result = await service.aprovarOrcamento('OS-2026-000001', 'ABC1D23');

      expect(result.status).toBe('EM_EXECUCAO');
      expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
        'ordem-1',
        'EM_EXECUCAO',
        'AVANCO',
        'usuario-1',
        'Orçamento aprovado pelo cliente',
      );
    });

    it('lança NotFoundException quando OS não encontrada', async () => {
      mockOrdemRepo.findByCodigoEPlaca.mockResolvedValue(null);

      await expect(
        service.aprovarOrcamento('OS-INEXISTENTE', 'XYZ9999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança ConflictException quando OS não está em AGUARDANDO_APROVACAO', async () => {
      const ordem = new OrdemServico(
        'cliente-1',
        'veiculo-1',
        'usuario-1',
        'EM_DIAGNOSTICO',
        null,
        0,
        0,
        0,
        'OS-2026-000001',
        'ordem-1',
      );
      mockOrdemRepo.findByCodigoEPlaca.mockResolvedValue(ordem);

      await expect(
        service.aprovarOrcamento('OS-2026-000001', 'ABC1D23'),
      ).rejects.toThrow(ConflictException);
      expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
    });
  });
});
