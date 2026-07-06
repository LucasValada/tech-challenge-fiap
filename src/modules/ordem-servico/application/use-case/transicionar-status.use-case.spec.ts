import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { TransicionarStatusUseCase } from './transicionar-status.use-case';
import { StatusOrdemServico } from '../../domain/entity/OrdemServico';

const mockOrdemRepo = {
  findById: jest.fn(),
  transicionarStatus: jest.fn(),
  findByIdComDetalhes: jest.fn(),
};
const mockClienteRepo = { getOne: jest.fn() };
const mockEmailSender = {
  enviarNotificacaoFinalizacao: jest.fn(),
  enviarNotificacaoEntrega: jest.fn(),
};

const detalhesMinimos = {
  codigo: 'OS-2026-000001',
  cliente: { id: 'cliente-1', nome: 'João' },
  veiculo: { placa: 'ABC1D23' },
};

describe('TransicionarStatusUseCase', () => {
  let useCase: TransicionarStatusUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TransicionarStatusUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
        { provide: 'CLIENTE_REPOSITORY', useValue: mockClienteRepo },
        { provide: 'EMAIL_SENDER', useValue: mockEmailSender },
      ],
    }).compile();

    useCase = moduleRef.get(TransicionarStatusUseCase);
    jest.clearAllMocks();
  });

  const mockTransicaoOk = (statusOrigem: StatusOrdemServico) => {
    mockOrdemRepo.findById.mockResolvedValue({ status: statusOrigem });
    mockOrdemRepo.transicionarStatus.mockResolvedValue({
      status: statusOrigem,
    });
    mockOrdemRepo.findByIdComDetalhes.mockResolvedValue(detalhesMinimos);
  };

  it('delega ao repositório quando o avanço linear é válido', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });
    const atualizada = { status: 'EM_DIAGNOSTICO' };
    mockOrdemRepo.transicionarStatus.mockResolvedValue(atualizada);

    const result = await useCase.execute('ordem-1', 'usuario-1', {
      status: 'EM_DIAGNOSTICO',
      observacao: 'iniciando diagnóstico',
    });

    expect(result).toBe(atualizada);
    expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
      'ordem-1',
      'EM_DIAGNOSTICO',
      'AVANCO',
      'usuario-1',
      'iniciando diagnóstico',
    );
  });

  it('lança ConflictException quando tenta pular passos', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'RECEBIDA' });

    await expect(
      useCase.execute('ordem-1', 'usuario-1', { status: 'FINALIZADA' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
  });

  it('dispara enviarNotificacaoFinalizacao em transição para FINALIZADA', async () => {
    mockTransicaoOk('EM_EXECUCAO');
    mockClienteRepo.getOne.mockResolvedValue({ email: 'joao@email.com' });

    await useCase.execute('ordem-1', 'usuario-1', { status: 'FINALIZADA' });

    expect(mockEmailSender.enviarNotificacaoFinalizacao).toHaveBeenCalledWith({
      clienteNome: 'João',
      clienteEmail: 'joao@email.com',
      codigoOS: 'OS-2026-000001',
      placa: 'ABC1D23',
    });
    expect(mockEmailSender.enviarNotificacaoEntrega).not.toHaveBeenCalled();
  });

  it('dispara enviarNotificacaoEntrega em transição para ENTREGUE', async () => {
    mockTransicaoOk('FINALIZADA');
    mockClienteRepo.getOne.mockResolvedValue({ email: 'joao@email.com' });

    await useCase.execute('ordem-1', 'usuario-1', { status: 'ENTREGUE' });

    expect(mockEmailSender.enviarNotificacaoEntrega).toHaveBeenCalledWith({
      clienteNome: 'João',
      clienteEmail: 'joao@email.com',
      codigoOS: 'OS-2026-000001',
      placa: 'ABC1D23',
    });
    expect(mockEmailSender.enviarNotificacaoFinalizacao).not.toHaveBeenCalled();
  });

  it('não dispara email em transições que não são FINALIZADA nem ENTREGUE', async () => {
    mockTransicaoOk('RECEBIDA');

    await useCase.execute('ordem-1', 'usuario-1', { status: 'EM_DIAGNOSTICO' });

    expect(mockEmailSender.enviarNotificacaoFinalizacao).not.toHaveBeenCalled();
    expect(mockEmailSender.enviarNotificacaoEntrega).not.toHaveBeenCalled();
    expect(mockClienteRepo.getOne).not.toHaveBeenCalled();
  });

  it('não dispara email quando o cliente não tem email cadastrado', async () => {
    mockTransicaoOk('EM_EXECUCAO');
    mockClienteRepo.getOne.mockResolvedValue({ email: null });

    await useCase.execute('ordem-1', 'usuario-1', { status: 'FINALIZADA' });

    expect(mockEmailSender.enviarNotificacaoFinalizacao).not.toHaveBeenCalled();
  });

  it('falha silenciosamente no email sem bloquear a transição', async () => {
    mockTransicaoOk('EM_EXECUCAO');
    mockClienteRepo.getOne.mockResolvedValue({ email: 'joao@email.com' });
    mockEmailSender.enviarNotificacaoFinalizacao.mockRejectedValue(
      new Error('SMTP down'),
    );

    await expect(
      useCase.execute('ordem-1', 'usuario-1', { status: 'FINALIZADA' }),
    ).resolves.toBeDefined();
  });
});
