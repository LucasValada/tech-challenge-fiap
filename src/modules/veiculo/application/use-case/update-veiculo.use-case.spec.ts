import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateVeiculoUseCase } from './update-veiculo.use-case';

const VEICULO_ID_EXISTENTE = 'uuid-existente';
const VEICULO_ID_INEXISTENTE = 'uuid-inexistente';
const PLACA_ATUAL = 'ABC1D23';
const PLACA_NOVA = 'NEW1B23';

const mockVeiculoRepository = {
  findById: jest.fn(),
  findByPlaca: jest.fn(),
  update: jest.fn(),
};

const veiculoMock = {
  id: VEICULO_ID_EXISTENTE,
  placa: PLACA_ATUAL,
  marca: 'Ford',
  modelo: 'Ka',
  ano: 2020,
};

describe('UpdateVeiculoUseCase', () => {
  let useCase: UpdateVeiculoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVeiculoUseCase,
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepository },
      ],
    }).compile();

    useCase = moduleRef.get(UpdateVeiculoUseCase);
    jest.clearAllMocks();
  });

  it('atualiza veículo existente sem mudar placa', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(veiculoMock);
    const atualizado = { ...veiculoMock, modelo: 'Fiesta' };
    mockVeiculoRepository.update.mockResolvedValue(atualizado);

    const result = await useCase.execute(VEICULO_ID_EXISTENTE, {
      modelo: 'Fiesta',
    });

    expect(result).toBe(atualizado);
    expect(mockVeiculoRepository.findByPlaca).not.toHaveBeenCalled();
    expect(mockVeiculoRepository.update).toHaveBeenCalledWith(
      VEICULO_ID_EXISTENTE,
      { modelo: 'Fiesta' },
    );
  });

  it('valida placa única quando alterando placa', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(veiculoMock);
    mockVeiculoRepository.findByPlaca.mockResolvedValue(null);
    mockVeiculoRepository.update.mockResolvedValue({
      ...veiculoMock,
      placa: PLACA_NOVA,
    });

    await useCase.execute(VEICULO_ID_EXISTENTE, { placa: PLACA_NOVA });

    expect(mockVeiculoRepository.findByPlaca).toHaveBeenCalledWith(
      PLACA_NOVA,
      VEICULO_ID_EXISTENTE,
    );
  });

  it('lança NotFoundException quando o veículo não existe', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(VEICULO_ID_INEXISTENTE, { placa: PLACA_NOVA }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockVeiculoRepository.update).not.toHaveBeenCalled();
  });

  it('lança ConflictException quando placa pertence a outro veículo', async () => {
    mockVeiculoRepository.findById.mockResolvedValue(veiculoMock);
    mockVeiculoRepository.findByPlaca.mockResolvedValue({
      ...veiculoMock,
      id: 'outro-uuid',
    });

    await expect(
      useCase.execute(VEICULO_ID_EXISTENTE, { placa: PLACA_NOVA }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockVeiculoRepository.update).not.toHaveBeenCalled();
  });
});
