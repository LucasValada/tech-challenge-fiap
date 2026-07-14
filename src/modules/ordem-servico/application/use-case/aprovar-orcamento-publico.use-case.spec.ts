import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AprovarOrcamentoPublicoUseCase } from './aprovar-orcamento-publico.use-case';

const mockOrdemRepo = {
  findByCodigoEPlaca: jest.fn(),
  transicionarStatus: jest.fn(),
  findPublicByCodigoEPlaca: jest.fn(),
};

describe('AprovarOrcamentoPublicoUseCase', () => {
  let useCase: AprovarOrcamentoPublicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AprovarOrcamentoPublicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(AprovarOrcamentoPublicoUseCase);
    jest.clearAllMocks();
  });

  it('aprova quando a OS está em AGUARDANDO_APROVACAO', async () => {
    mockOrdemRepo.findByCodigoEPlaca.mockResolvedValue({
      id: 'ordem-1',
      status: 'AGUARDANDO_APROVACAO',
      usuarioCriadorId: 'usuario-1',
    });
    mockOrdemRepo.transicionarStatus.mockResolvedValue({});
    mockOrdemRepo.findPublicByCodigoEPlaca.mockResolvedValue({
      status: 'EM_EXECUCAO',
    });

    const result = await useCase.execute('OS-2026-000001', 'ABC1D23');

    expect(result.status).toBe('EM_EXECUCAO');
    expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
      'ordem-1',
      'EM_EXECUCAO',
      'AVANCO',
      'usuario-1',
      'Orçamento aprovado pelo cliente',
    );
  });

  it('lança NotFoundException quando a OS não é encontrada', async () => {
    mockOrdemRepo.findByCodigoEPlaca.mockResolvedValue(null);

    await expect(
      useCase.execute('OS-INEXISTENTE', 'XYZ9999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança ConflictException quando a OS não está em AGUARDANDO_APROVACAO', async () => {
    mockOrdemRepo.findByCodigoEPlaca.mockResolvedValue({
      id: 'ordem-1',
      status: 'EM_DIAGNOSTICO',
      usuarioCriadorId: 'usuario-1',
    });

    await expect(
      useCase.execute('OS-2026-000001', 'ABC1D23'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
  });
});
