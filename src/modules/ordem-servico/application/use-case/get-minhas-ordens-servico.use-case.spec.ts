import { Test, TestingModule } from '@nestjs/testing';
import { GetMinhasOrdensServicoUseCase } from './get-minhas-ordens-servico.use-case';

const mockRepo = {
  findByClienteId: jest.fn(),
};

describe('GetMinhasOrdensServicoUseCase', () => {
  let useCase: GetMinhasOrdensServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetMinhasOrdensServicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetMinhasOrdensServicoUseCase);
    jest.clearAllMocks();
  });

  it('consulta as OS do cliente pelo clienteId do token', async () => {
    const resultado = { ordens: [], count: 0 };
    mockRepo.findByClienteId.mockResolvedValue(resultado);

    const retorno = await useCase.execute('cliente-uuid');

    expect(mockRepo.findByClienteId).toHaveBeenCalledWith('cliente-uuid');
    expect(retorno).toBe(resultado);
  });
});
