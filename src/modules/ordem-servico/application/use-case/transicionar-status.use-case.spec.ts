import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { TransicionarStatusUseCase } from './transicionar-status.use-case';
import { NotificadorStatusOS } from '../shared/notificador-status-os';
import { OrdemServicoAlteradaError } from '../../domain/errors';

const mockOrdemRepo = {
  findById: jest.fn(),
  transicionarStatus: jest.fn(),
};
const mockNotificador = { notificar: jest.fn() };

describe('TransicionarStatusUseCase', () => {
  let useCase: TransicionarStatusUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TransicionarStatusUseCase,
        { provide: 'ORDEM_SERVICO_REPOSITORY', useValue: mockOrdemRepo },
        { provide: NotificadorStatusOS, useValue: mockNotificador },
      ],
    }).compile();

    useCase = moduleRef.get(TransicionarStatusUseCase);
    jest.clearAllMocks();
  });

  it('registra a entrega a partir de FINALIZADA e avisa o cliente', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'FINALIZADA' });
    const entregue = { id: 'ordem-1', status: 'ENTREGUE' };
    mockOrdemRepo.transicionarStatus.mockResolvedValue(entregue);

    const resultado = await useCase.execute('ordem-1', 'usuario-1', {
      status: 'ENTREGUE',
      observacao: 'Cliente retirou o veículo',
    });

    expect(resultado).toBe(entregue);
    expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
      'ordem-1',
      'ENTREGUE',
      'AVANCO',
      'usuario-1',
      'Cliente retirou o veículo',
      { statusEsperados: ['FINALIZADA'] },
    );
    expect(mockNotificador.notificar).toHaveBeenCalledWith(
      'ordem-1',
      'ENTREGUE',
    );
  });

  it('sem observação, grava null', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'FINALIZADA' });
    mockOrdemRepo.transicionarStatus.mockResolvedValue({});

    await useCase.execute('ordem-1', 'usuario-1', { status: 'ENTREGUE' });

    expect(mockOrdemRepo.transicionarStatus).toHaveBeenCalledWith(
      'ordem-1',
      'ENTREGUE',
      'AVANCO',
      'usuario-1',
      null,
      { statusEsperados: ['FINALIZADA'] },
    );
  });

  it.each([
    ['RECEBIDA', 'EM_DIAGNOSTICO'],
    ['EM_EXECUCAO', 'FINALIZADA'],
    ['AGUARDANDO_APROVACAO', 'EM_EXECUCAO'],
    ['ENTREGUE', 'FINALIZADA'],
  ] as const)(
    'recusa com 409 a transição %s → %s, que é da Saga',
    async (de, para) => {
      mockOrdemRepo.findById.mockResolvedValue({ status: de });

      await expect(
        useCase.execute('ordem-1', 'usuario-1', { status: para }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockOrdemRepo.transicionarStatus).not.toHaveBeenCalled();
      expect(mockNotificador.notificar).not.toHaveBeenCalled();
    },
  );

  it('outra ação mudou a OS no meio: 409 e nenhum e-mail', async () => {
    mockOrdemRepo.findById.mockResolvedValue({ status: 'FINALIZADA' });
    mockOrdemRepo.transicionarStatus.mockRejectedValue(
      new OrdemServicoAlteradaError('ordem-1', ['FINALIZADA']),
    );

    await expect(
      useCase.execute('ordem-1', 'usuario-1', { status: 'ENTREGUE' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockNotificador.notificar).not.toHaveBeenCalled();
  });
});
