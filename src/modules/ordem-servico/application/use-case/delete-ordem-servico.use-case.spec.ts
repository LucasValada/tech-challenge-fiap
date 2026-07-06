import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteOrdemServicoUseCase } from './delete-ordem-servico.use-case';

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

  it('deleta a OS quando ela existe', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ id: 'ordem-1' });
    mockOrdemRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('ordem-1');

    expect(mockOrdemRepo.delete).toHaveBeenCalledWith('ordem-1');
  });

  it('lança NotFoundException quando a OS não existe', async () => {
    mockOrdemRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockOrdemRepo.delete).not.toHaveBeenCalled();
  });
});
