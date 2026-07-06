import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EnviarOrcamentoUseCase } from './enviar-orcamento.use-case';

const mockOrdemRepo = {
  findById: jest.fn(),
  contarLinhas: jest.fn(),
  transicionarStatus: jest.fn(),
  findByIdComDetalhes: jest.fn(),
};
const mockClienteRepo = { getOne: jest.fn() };
const mockEmailSender = { enviarOrcamento: jest.fn() };

const detalhesView = {
  id: 'ordem-1',
  codigo: 'OS-2026-000001',
  status: 'AGUARDANDO_APROVACAO',
  observacoes: null,
  valorServicos: 100,
  valorPecas: 50,
  valorTotal: 150,
  cliente: { id: 'cliente-1', nome: 'João', cpfCnpj: '52998224725' },
  veiculo: {
    id: 'veiculo-1',
    placa: 'ABC1D23',
    marca: 'VW',
    modelo: 'Gol',
    ano: 2020,
  },
  servicos: [
    { nomeSnapshot: 'Troca de óleo', precoUnitario: 100, quantidade: 1 },
  ],
  itens: [{ nomeSnapshot: 'Filtro', precoUnitario: 50, quantidade: 1 }],
};

describe('EnviarOrcamentoUseCase', () => {
  let useCase: EnviarOrcamentoUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EnviarOrcamentoUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
        { provide: 'CLIENTE_REPOSITORY', useValue: mockClienteRepo },
        { provide: 'EMAIL_SENDER', useValue: mockEmailSender },
      ],
    }).compile();

    useCase = moduleRef.get(EnviarOrcamentoUseCase);
    jest.clearAllMocks();
  });

  it('envia orçamento e retorna detalhes quando OS está em EM_DIAGNOSTICO com itens', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_DIAGNOSTICO' });
    mockOrdemRepo.contarLinhas.mockResolvedValue({ servicos: 1, itens: 0 });
    mockOrdemRepo.transicionarStatus.mockResolvedValue({});
    mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(detalhesView);
    mockClienteRepo.getOne.mockResolvedValue({ email: 'joao@email.com' });
    mockEmailSender.enviarOrcamento.mockResolvedValue(undefined);

    const result = await useCase.execute('ordem-1', 'usuario-1');

    expect(result).toBe(detalhesView);
    expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
      'ordem-1',
      'AGUARDANDO_APROVACAO',
      'AVANCO',
      'usuario-1',
      'Orçamento enviado para aprovação do cliente',
    );
    expect(mockEmailSender.enviarOrcamento).toHaveBeenCalled();
  });

  it('não envia email quando cliente não tem email', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_DIAGNOSTICO' });
    mockOrdemRepo.contarLinhas.mockResolvedValue({ servicos: 1, itens: 0 });
    mockOrdemRepo.transicionarStatus.mockResolvedValue({});
    mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(detalhesView);
    mockClienteRepo.getOne.mockResolvedValue({ email: null });

    await useCase.execute('ordem-1', 'usuario-1');

    expect(mockEmailSender.enviarOrcamento).not.toHaveBeenCalled();
  });

  it('lança ConflictException quando OS não está em EM_DIAGNOSTICO', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });

    await expect(
      useCase.execute('ordem-1', 'usuario-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.contarLinhas).not.toHaveBeenCalled();
  });

  it('lança UnprocessableEntityException quando OS não tem serviços nem itens', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'EM_DIAGNOSTICO' });
    mockOrdemRepo.contarLinhas.mockResolvedValue({ servicos: 0, itens: 0 });

    await expect(
      useCase.execute('ordem-1', 'usuario-1'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
  });
});
