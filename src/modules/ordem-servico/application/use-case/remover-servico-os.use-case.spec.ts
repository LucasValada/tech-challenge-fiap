import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RemoverServicoOSUseCase } from './remover-servico-os.use-case';

const mockOrdemRepo = { findById: jest.fn(), removerServico: jest.fn() };

describe('RemoverServicoOSUseCase', () => {
  let useCase: RemoverServicoOSUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RemoverServicoOSUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(RemoverServicoOSUseCase);
    jest.clearAllMocks();
  });

  it('remove o serviço quando a OS é mutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    mockOrdemRepo.removerServico.mockResolvedValue(undefined);

    await useCase.execute('ordem-1', 'linha-1');

    expect(mockOrdemRepo.removerServico).toHaveBeenCalledWith(
      'ordem-1',
      'linha-1',
    );
  });

  it('lança ConflictException quando a OS é imutável', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_EXECUCAO' });

    await expect(useCase.execute('ordem-1', 'linha-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mockOrdemRepo.removerServico).not.toHaveBeenCalled();
  });
});
