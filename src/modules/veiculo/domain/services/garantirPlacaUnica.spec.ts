import { ConflictException } from '@nestjs/common';
import { garantirPlacaUnica } from './garantirPlacaUnica';

const PLACA_NOVA = 'ABC1D23';
const PLACA_EXISTENTE = 'XYZ9W87';
const PLACA_DO_VEICULO = 'AUT1A23';
const VEICULO_ID = 'uuid-1';

const mockVeiculoRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByPlaca: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('garantirPlacaUnica', () => {
  beforeEach(() => jest.clearAllMocks());

  it('não lança quando placa não existe', async () => {
    mockVeiculoRepo.findByPlaca.mockResolvedValue(null);

    await expect(
      garantirPlacaUnica(mockVeiculoRepo, PLACA_NOVA),
    ).resolves.toBeUndefined();
    expect(mockVeiculoRepo.findByPlaca).toHaveBeenCalledWith(
      PLACA_NOVA,
      undefined,
    );
  });

  it('lança ConflictException quando placa já existe', async () => {
    mockVeiculoRepo.findByPlaca.mockResolvedValue({ id: 'outro' });

    await expect(
      garantirPlacaUnica(mockVeiculoRepo, PLACA_EXISTENTE),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('passa excludeId para o repositório no update', async () => {
    mockVeiculoRepo.findByPlaca.mockResolvedValue(null);

    await garantirPlacaUnica(mockVeiculoRepo, PLACA_DO_VEICULO, VEICULO_ID);

    expect(mockVeiculoRepo.findByPlaca).toHaveBeenCalledWith(
      PLACA_DO_VEICULO,
      VEICULO_ID,
    );
  });
});
