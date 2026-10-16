import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Envelope } from '../../../../common/mensageria/envelope';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../domain/entity/OrdemServico';
import { OrdemServicoAlteradaError } from '../../domain/errors';
import type {
  OpcoesTransicao,
  OrdemServicoRepository,
} from '../../domain/repository/ordem-servico.repository';
import type { PublicadorComandos } from '../saga/mensagens-saga';
import { CancelarOrdemServicoUseCase } from './cancelar-ordem-servico.use-case';

function ordemEm(status: StatusOrdemServico): OrdemServico {
  const ordem = new OrdemServico(
    'cliente-1',
    'veiculo-1',
    'criador-1',
    status,
    null,
    0,
    0,
    0,
    'OS-2026-000001',
    'ordem-1',
  );
  ordem.correlationId = 'fluxo-da-os';
  return ordem;
}

describe('CancelarOrdemServicoUseCase', () => {
  const repositorio = { findById: jest.fn(), transicionarStatus: jest.fn() };
  const publicador = { publicar: jest.fn() };
  const useCase = new CancelarOrdemServicoUseCase(
    repositorio as unknown as OrdemServicoRepository,
    publicador as unknown as PublicadorComandos,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    publicador.publicar.mockResolvedValue(undefined);
    repositorio.transicionarStatus.mockImplementation(
      async (
        _id: string,
        _para: StatusOrdemServico,
        _tipo: string,
        _usuario: string,
        _obs: string,
        opcoes: OpcoesTransicao,
      ) => {
        const gravada = ordemEm('CANCELADA');
        await opcoes.antesDoCommit?.(gravada);
        return gravada;
      },
    );
  });

  it.each<StatusOrdemServico>(['AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO'])(
    'em %s: cancela, devolve o estoque e manda o Billing cancelar o orçamento',
    async (status) => {
      repositorio.findById.mockResolvedValue(ordemEm(status));

      const cancelada = await useCase.execute(
        'ordem-1',
        'funcionario-1',
        'Cliente desistiu',
      );

      expect(cancelada.status).toBe('CANCELADA');
      const [id, para, tipo, usuario, observacao, opcoes] = repositorio
        .transicionarStatus.mock.calls[0] as [
        string,
        string,
        string,
        string,
        string,
        OpcoesTransicao,
      ];
      expect([id, para, tipo, usuario, observacao]).toEqual([
        'ordem-1',
        'CANCELADA',
        'COMPENSACAO',
        'funcionario-1',
        'Cancelada pelo funcionário: Cliente desistiu',
      ]);
      expect(opcoes).toMatchObject({
        statusEsperados: [status],
        devolverEstoque: true,
        motivoCancelamento: 'Cancelada pelo funcionário: Cliente desistiu',
      });
      const [[envelope]] = publicador.publicar.mock.calls as [[Envelope]][];
      expect(envelope).toMatchObject({
        tipo: 'CancelarOrcamento',
        osId: 'ordem-1',
        correlationId: 'fluxo-da-os',
        payload: { motivo: 'Cliente desistiu' },
      });
    },
  );

  it.each<StatusOrdemServico>([
    'RECEBIDA',
    'EM_DIAGNOSTICO',
    'EM_EXECUCAO',
    'FINALIZADA',
    'ENTREGUE',
    'CANCELADA',
  ])('em %s: 409, nada muda nem é publicado', async (status) => {
    repositorio.findById.mockResolvedValue(ordemEm(status));

    await expect(
      useCase.execute('ordem-1', 'funcionario-1', 'qualquer'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
    expect(publicador.publicar).not.toHaveBeenCalled();
  });

  it('OS inexistente: 404', async () => {
    repositorio.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('ordem-1', 'funcionario-1', 'qualquer'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uma resposta da Saga mudou a OS no meio: 409', async () => {
    repositorio.findById.mockResolvedValue(ordemEm('AGUARDANDO_PAGAMENTO'));
    repositorio.transicionarStatus.mockRejectedValue(
      new OrdemServicoAlteradaError('ordem-1', ['AGUARDANDO_PAGAMENTO']),
    );

    await expect(
      useCase.execute('ordem-1', 'funcionario-1', 'qualquer'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
