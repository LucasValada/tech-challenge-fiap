import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetVeiculoByIdUseCase } from './get-veiculo-by-id.use-case';

const VEICULO_ID_EXISTENTE = 'uuid-existente';
const VEICULO_ID_INEXISTENTE = 'uuid-inexistente';

const mockVeiculoRepository = {
  findById: jest.fn(),
};

const veiculoMock = {
  id: VEICULO_ID_EXISTENTE,
  placa: 'ABC1D23',
  marca: 'Ford',
  modelo: 'Ka',
  ano: 2020,
};

describe('GetVeiculoByIdUseCase', () => {
  let useCase: GetVeiculoByIdUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetVeiculoByIdUseCase,
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepository },
      ],
    }).compile();

    useCase = moduleRef.get(GetVeiculoByIdUseCase);
    jest.clearAllMocks();
  });

  it('retorna o veículo quando encontrado', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(veiculoMock);

    const result = await useCase.execute(VEICULO_ID_EXISTENTE);

    expect(result).toBe(veiculoMock);
    expect(mockVeiculoRepository.findById).toHaveBeenCalledWith(
      VEICULO_ID_EXISTENTE,
    );
  });

  it('lança NotFoundException quando o veículo não existe', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(VEICULO_ID_INEXISTENTE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
