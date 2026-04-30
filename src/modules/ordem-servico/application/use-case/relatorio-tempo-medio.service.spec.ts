import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RelatorioTempoMedioService } from './relatorio-tempo-medio.service';
import { ORDEM_SERVICO_REPOSITORY } from '../../domain/repository/ordem-servico.repository';

const mockOrdemRepo = {
  getRelatorioTempoMedioPorServico: jest.fn(),
};

const relatorioBase = {
  totalOrdensConsideradas: 5,
  servicos: [
    {
      servicoId: 'svc-1',
      nome: 'Troca de óleo',
      totalExecucoes: 5,
      tempoMedioMinutos: 120,
    },
  ],
};

describe('RelatorioTempoMedioService', () => {
  let service: RelatorioTempoMedioService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RelatorioTempoMedioService,
        { provide: ORDEM_SERVICO_REPOSITORY, useValue: mockOrdemRepo },
      ],
    }).compile();

    service = moduleRef.get(RelatorioTempoMedioService);
    jest.clearAllMocks();
  });

  it('retorna relatório sem filtros de data', async () => {
    mockOrdemRepo.getRelatorioTempoMedioPorServico.mockResolvedValue(
      relatorioBase,
    );

    const result = await service.gerarTempoMedioPorServico({});

    expect(result.totalOrdensConsideradas).toBe(5);
    expect(result.periodo.dataInicio).toBeNull();
    expect(result.periodo.dataFim).toBeNull();
    expect(mockOrdemRepo.getRelatorioTempoMedioPorServico).toHaveBeenCalledWith(
      { dataInicio: undefined, dataFim: undefined, servicoId: undefined },
    );
  });

  it('retorna relatório com filtro de datas e servicoId', async () => {
    mockOrdemRepo.getRelatorioTempoMedioPorServico.mockResolvedValue(
      relatorioBase,
    );

    const result = await service.gerarTempoMedioPorServico({
      dataInicio: '2026-01-01',
      dataFim: '2026-01-31',
      servicoId: 'svc-1',
    });

    expect(result.periodo.dataInicio).toBe('2026-01-01');
    expect(result.periodo.dataFim).toBe('2026-01-31');
    const chamada =
      mockOrdemRepo.getRelatorioTempoMedioPorServico.mock.calls[0][0];
    expect(chamada.dataInicio).toBeInstanceOf(Date);
    expect(chamada.dataFim).toBeInstanceOf(Date);
    expect(chamada.dataFim.getUTCHours()).toBe(23);
    expect(chamada.dataFim.getUTCMinutes()).toBe(59);
    expect(chamada.servicoId).toBe('svc-1');
  });

  it('lança BadRequestException quando dataInicio > dataFim', async () => {
    await expect(
      service.gerarTempoMedioPorServico({
        dataInicio: '2026-12-31',
        dataFim: '2026-01-01',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockOrdemRepo.getRelatorioTempoMedioPorServico,
    ).not.toHaveBeenCalled();
  });

  it('aceita apenas dataInicio sem dataFim', async () => {
    mockOrdemRepo.getRelatorioTempoMedioPorServico.mockResolvedValue(
      relatorioBase,
    );

    const result = await service.gerarTempoMedioPorServico({
      dataInicio: '2026-01-01',
    });

    expect(result.periodo.dataFim).toBeNull();
    const chamada =
      mockOrdemRepo.getRelatorioTempoMedioPorServico.mock.calls[0][0];
    expect(chamada.dataInicio).toBeInstanceOf(Date);
    expect(chamada.dataFim).toBeUndefined();
  });

  it('aceita apenas dataFim sem dataInicio', async () => {
    mockOrdemRepo.getRelatorioTempoMedioPorServico.mockResolvedValue(
      relatorioBase,
    );

    const result = await service.gerarTempoMedioPorServico({
      dataFim: '2026-06-30',
    });

    expect(result.periodo.dataInicio).toBeNull();
    const chamada =
      mockOrdemRepo.getRelatorioTempoMedioPorServico.mock.calls[0][0];
    expect(chamada.dataInicio).toBeUndefined();
    expect(chamada.dataFim).toBeInstanceOf(Date);
  });
});
