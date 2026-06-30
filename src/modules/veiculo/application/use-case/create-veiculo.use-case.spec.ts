import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateVeiculoUseCase } from './create-veiculo.use-case';

const PLACA_NOVA = 'ABC1D23';
const PLACA_EXISTENTE = 'XYZ9W87';
const CLIENTE_ID = 'cliente-uuid';

const mockVeiculoRepository = {
  create: jest.fn(),
  findByPlaca: jest.fn(),
};

const dtoBase = {
  placa: PLACA_NOVA,
  marca: 'Ford',
  modelo: 'Ka',
  ano: 2020,
  clienteId: CLIENTE_ID,
};

const veiculoMock = { id: 'veiculo-uuid', ...dtoBase };

describe('CreateVeiculoUseCase', () => {
  let useCase: CreateVeiculoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateVeiculoUseCase,
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepository },
      ],
    }).compile();

    useCase = moduleRef.get(CreateVeiculoUseCase);
    jest.clearAllMocks();
  });

  it('cria veículo quando placa não existe', async () => {
    mockVeiculoRepository.findByPlaca.mockResolvedValue(null);
    mockVeiculoRepository.create.mockResolvedValue(veiculoMock);

    const result = await useCase.execute(dtoBase);

    expect(result).toBe(veiculoMock);
    expect(mockVeiculoRepository.findByPlaca).toHaveBeenCalledWith(
      PLACA_NOVA,
      undefined,
    );
    expect(mockVeiculoRepository.create).toHaveBeenCalledWith(dtoBase);
  });

  it('lança ConflictException quando placa já existe', async () => {
    mockVeiculoRepository.findByPlaca.mockResolvedValue(veiculoMock);

    await expect(
      useCase.execute({ ...dtoBase, placa: PLACA_EXISTENTE }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockVeiculoRepository.create).not.toHaveBeenCalled();
  });
});
