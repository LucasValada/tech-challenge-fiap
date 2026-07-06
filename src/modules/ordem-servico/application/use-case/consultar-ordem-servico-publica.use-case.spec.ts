import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConsultarOrdemServicoPublicaUseCase } from './consultar-ordem-servico-publica.use-case';

const mockOrdemRepo = { findPublicByCodigoEPlaca: jest.fn() };

const publicView = {
  codigo: 'OS-2026-000001',
  status: 'AGUARDANDO_APROVACAO',
  cliente: { nome: 'João' },
  veiculo: { placa: 'ABC1D23', marca: 'VW', modelo: 'Gol', ano: 2020 },
  servicos: [],
  itens: [],
  historicoStatus: [],
};

describe('ConsultarOrdemServicoPublicaUseCase', () => {
  let useCase: ConsultarOrdemServicoPublicaUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultarOrdemServicoPublicaUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(ConsultarOrdemServicoPublicaUseCase);
    jest.clearAllMocks();
  });

  it('retorna a OS quando encontrada', async () => {
    mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue(publicView);

    const result = await useCase.execute('OS-2026-000001', 'ABC1D23');

    expect(result).toBe(publicView);
    expect(mockOrdemRepo.findPublicByCodigoEPlaca).toHaveBeenCalledWith(
      'OS-2026-000001',
      'ABC1D23',
    );
  });

  it('normaliza código e placa (trim + uppercase)', async () => {
    mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue(publicView);

    await useCase.execute(' os-2026-000001 ', ' abc1d23 ');

    expect(mockOrdemRepo.findPublicByCodigoEPlaca).toHaveBeenCalledWith(
      'OS-2026-000001',
      'ABC1D23',
    );
  });

  it('lança NotFoundException quando a OS não é encontrada', async () => {
    mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue(null);

    await expect(
      useCase.execute('OS-INEXISTENTE', 'XYZ9999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
