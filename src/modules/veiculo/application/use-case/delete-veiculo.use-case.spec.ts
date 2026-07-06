import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteVeiculoUseCase } from './delete-veiculo.use-case';

const VEICULO_ID_EXISTENTE = 'uuid-existente';
const VEICULO_ID_INEXISTENTE = 'uuid-inexistente';

const mockVeiculoRepository = {
  findById: jest.fn(),
  delete: jest.fn(),
};

const veiculoMock = {
  id: VEICULO_ID_EXISTENTE,
  placa: 'ABC1D23',
  marca: 'Ford',
  modelo: 'Ka',
  ano: 2020,
};

describe('DeleteVeiculoUseCase', () => {
  let useCase: DeleteVeiculoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteVeiculoUseCase,
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepository },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteVeiculoUseCase);
    jest.clearAllMocks();
  });

  it('deleta o veículo quando existe', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(veiculoMock);
    mockVeiculoRepository.delete.mockResolvedValue(veiculoMock);

    await useCase.execute(VEICULO_ID_EXISTENTE);

    expect(mockVeiculoRepository.delete).toHaveBeenCalledWith(
      VEICULO_ID_EXISTENTE,
    );
  });

  it('lança NotFoundException quando o veículo não existe', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(VEICULO_ID_INEXISTENTE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockVeiculoRepository.delete).not.toHaveBeenCalled();
  });
});
