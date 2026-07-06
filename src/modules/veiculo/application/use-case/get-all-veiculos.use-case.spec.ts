import { Test, TestingModule } from '@nestjs/testing';
import { GetAllVeiculosUseCase } from './get-all-veiculos.use-case';

const mockVeiculoRepository = {
  findAll: jest.fn(),
};

describe('GetAllVeiculosUseCase', () => {
  let useCase: GetAllVeiculosUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllVeiculosUseCase,
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepository },
      ],
    }).compile();

    useCase = moduleRef.get(GetAllVeiculosUseCase);
    jest.clearAllMocks();
  });

  it('delega para o repositório e retorna a lista', async () => {
    const resultado = { veiculo: [{ id: 'v1' }, { id: 'v2' }], count: 2 };
    mockVeiculoRepository.findAll.mockResolvedValue(resultado);

    const result = await useCase.execute();

    expect(result).toBe(resultado);
    expect(mockVeiculoRepository.findAll).toHaveBeenCalled();
  });
});
