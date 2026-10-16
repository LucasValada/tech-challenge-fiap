import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteOrdemServicoUseCase } from './delete-ordem-servico.use-case';
import { StatusOrdemServico } from '../../domain/entity/OrdemServico';

const mockOrdemRepo = { findById: jest.fn(), delete: jest.fn() };

describe('DeleteOrdemServicoUseCase', () => {
  let useCase: DeleteOrdemServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteOrdemServicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteOrdemServicoUseCase);
    jest.clearAllMocks();
  });

  it('deleta a OS cancelada', async () => {
    mockOrdemRepo.findById.mockResolvedValue({
      id: 'ordem-1',
      status: 'CANCELADA',
    });
    mockOrdemRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('ordem-1');

    expect(mockOrdemRepo.delete).toHaveBeenCalledWith('ordem-1');
  });

  it.each<StatusOrdemServico>([
    'RECEBIDA',
    'EM_DIAGNOSTICO',
    'AGUARDANDO_APROVACAO',
    'AGUARDANDO_PAGAMENTO',
    'EM_EXECUCAO',
    'FINALIZADA',
    'ENTREGUE',
  ])('recusa com 409 a OS em %s (deixaria a Saga órfã)', async (status) => {
    mockOrdemRepo.findById.mockResolvedValue({ id: 'ordem-1', status });

    await expect(useCase.execute('ordem-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mockOrdemRepo.delete).not.toHaveBeenCalled();
  });

  it('lança NotFoundException quando a OS não existe', async () => {
    mockOrdemRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockOrdemRepo.delete).not.toHaveBeenCalled();
  });
});
