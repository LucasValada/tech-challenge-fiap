import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOrdemServicoUseCase } from './create-ordem-servico.use-case';
import { ServicoIndisponivelError } from '../../domain/errors';

const mockOrdemRepo = { createComItens: jest.fn() };
const mockClienteRepo = { findByCpfCnpj: jest.fn() };
const mockVeiculoRepo = { findByPlaca: jest.fn() };

const baseDto = {
  cpfCnpj: '529.982.247-25',
  placa: 'ABC1D23',
  observacoes: 'OS criada via balcão',
};

describe('CreateOrdemServicoUseCase', () => {
  let useCase: CreateOrdemServicoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrdemServicoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
        { provide: 'CLIENTE_REPOSITORY', useValue: mockClienteRepo },
        { provide: 'VEICULO_REPOSITORY', useValue: mockVeiculoRepo },
      ],
    }).compile();

    useCase = moduleRef.get(CreateOrdemServicoUseCase);
    jest.clearAllMocks();
  });

  it('lança NotFoundException quando cpfCnpj não tem cliente', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue(null);

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockClienteRepo.findByCpfCnpj).toHaveBeenCalledWith('52998224725');
    expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
  });

  it('lança NotFoundException quando veículo não encontrado', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue(null);

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
  });

  it('lança UnprocessableEntityException quando veículo é de outro cliente', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'OUTRO-CLIENTE',
    });

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(mockOrdemRepo.createComItens).not.toHaveBeenCalled();
  });

  it('traduz erro de domínio quando createComItens lança', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'cliente-1',
    });
    mockOrdemRepo.createComItens.mockRejectedValue(
      new ServicoIndisponivelError('svc-x'),
    );

    await expect(useCase.execute('usuario-1', baseDto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('cria OS no fluxo feliz com 1 serviço e 1 item', async () => {
    mockClienteRepo.findByCpfCnpj.mockResolvedValue({
      id: 'cliente-1',
      cpfCnpj: '52998224725',
    });
    mockVeiculoRepo.findByPlaca.mockResolvedValue({
      id: 'veiculo-1',
      clienteId: 'cliente-1',
    });
    const ordemCriada = { id: 'ordem-1' };
    mockOrdemRepo.createComItens.mockResolvedValue(ordemCriada);

    const result = await useCase.execute('usuario-1', {
      ...baseDto,
      servicos: [{ servicoId: 'svc-1', quantidade: 1 }],
      itens: [{ itemEstoqueId: 'item-1', quantidade: 2 }],
    });

    expect(result).toBe(ordemCriada);
    expect(mockOrdemRepo.createComItens).toHaveBeenCalledWith({
      clienteId: 'cliente-1',
      veiculoId: 'veiculo-1',
      usuarioCriadorId: 'usuario-1',
      observacoes: 'OS criada via balcão',
      servicos: [{ servicoId: 'svc-1', quantidade: 1 }],
      itens: [{ itemEstoqueId: 'item-1', quantidade: 2 }],
    });
  });
});
