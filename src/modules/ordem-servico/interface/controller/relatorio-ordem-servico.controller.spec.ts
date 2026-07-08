import { Test, TestingModule } from '@nestjs/testing';
import { RelatorioOrdemServicoController } from './relatorio-ordem-servico.controller';
import { RelatorioTempoMedioUseCase } from '../../application/use-case/relatorio-tempo-medio.use-case';
import { JwtAuthGuard } from '../../../../common/guards';

const mockRelatorio = { execute: jest.fn() };

describe('RelatorioOrdemServicoController', () => {
  let controller: RelatorioOrdemServicoController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [RelatorioOrdemServicoController],
      providers: [
        {
          provide: RelatorioTempoMedioUseCase,
          useValue: mockRelatorio,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(RelatorioOrdemServicoController);
    jest.clearAllMocks();
  });

  it('GET /tempo-medio-servicos delega para RelatorioTempoMedioUseCase sem filtros', async () => {
    const resp = {
      periodo: { dataInicio: null, dataFim: null },
      totalOrdensConsideradas: 0,
      servicos: [],
    } as never;
    mockRelatorio.execute.mockResolvedValue(resp);

    const result = await controller.tempoMedioServicos({});

    expect(result).toBe(resp);
    expect(mockRelatorio.execute).toHaveBeenCalledWith({});
  });

  it('GET /tempo-medio-servicos propaga query params (dataInicio, dataFim)', async () => {
    const query = { dataInicio: '2026-01-01', dataFim: '2026-12-31' };
    const resp = {
      periodo: { dataInicio: query.dataInicio, dataFim: query.dataFim },
      totalOrdensConsideradas: 3,
      servicos: [
        {
          servicoId: 's1',
          nome: 'Troca óleo',
          tempoEstimadoMin: 30,
          quantidadeOS: 3,
          tempoMedioMinutos: 25,
          tempoMinimoMinutos: 20,
          tempoMaximoMinutos: 30,
        },
      ],
    } as never;
    mockRelatorio.execute.mockResolvedValue(resp);

    const result = await controller.tempoMedioServicos(query);

    expect(result).toBe(resp);
    expect(mockRelatorio.execute).toHaveBeenCalledWith(query);
  });
});
