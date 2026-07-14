import { Test, TestingModule } from '@nestjs/testing';
import { GetAllClientesUseCase } from './get-all-clientes.use-case';

const mockRepo = { findAll: jest.fn() };

describe('GetAllClientesUseCase', () => {
  let useCase: GetAllClientesUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllClientesUseCase,
        { provide: 'CLIENTE_REPOSITORY', useValue: mockRepo },
      ],
    }).compile();

    useCase = moduleRef.get(GetAllClientesUseCase);
    jest.clearAllMocks();
  });

  it('delega para o repositório e retorna a lista', async () => {
    const lista = { cliente: [{ id: 'c1' }, { id: 'c2' }], count: 2 };
    mockRepo.findAll.mockResolvedValue(lista);

    const result = await useCase.execute();

    expect(result).toBe(lista);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });
});
