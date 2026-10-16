import {
  criarEnvelope,
  type Envelope,
} from '../../../../common/mensageria/envelope';
import {
  OrdemServico,
  StatusOrdemServico,
} from '../../domain/entity/OrdemServico';
import { OrdemServicoAlteradaError } from '../../domain/errors';
import type {
  OpcoesTransicao,
  OrdemServicoDetalhadaView,
  OrdemServicoRepository,
  SnapshotOrcamento,
} from '../../domain/repository/ordem-servico.repository';
import type { PublicadorComandos } from '../saga/mensagens-saga';
import type { NotificadorStatusOS } from '../shared/notificador-status-os';
import { ProcessarRespostaSagaUseCase } from './processar-resposta-saga.use-case';

const OS_ID = 'c56f9df1-b6f7-4625-84ce-a27706664ae5';

function ordemEm(status: StatusOrdemServico): OrdemServico {
  const ordem = new OrdemServico(
    'cliente-1',
    'veiculo-1',
    'criador-1',
    status,
    null,
    150.2,
    0,
    150.2,
    'OS-2026-000001',
    OS_ID,
  );
  ordem.correlationId = 'fluxo-da-os';
  return ordem;
}

function resposta(tipo: string, payload: Record<string, unknown> = {}) {
  return criarEnvelope(tipo, OS_ID, 'fluxo-da-os', payload);
}

const detalhes = {
  codigo: 'OS-2026-000001',
  veiculo: { placa: 'ABC1D23', marca: 'Fiat', modelo: 'Uno', ano: 2020 },
  servicos: [{ nomeSnapshot: 'Troca de óleo', quantidade: 1 }],
  itens: [{ nomeSnapshot: 'Filtro de óleo', quantidade: 2 }],
} as unknown as OrdemServicoDetalhadaView;

describe('ProcessarRespostaSagaUseCase', () => {
  const repositorio = {
    findById: jest.fn(),
    findByIdComDetalhes: jest.fn(),
    transicionarStatus: jest.fn(),
    registrarNoHistorico: jest.fn(),
    concluirDiagnostico: jest.fn(),
  };
  const publicador = { publicar: jest.fn() };
  const notificador = { notificar: jest.fn() };
  const useCase = new ProcessarRespostaSagaUseCase(
    repositorio as unknown as OrdemServicoRepository,
    publicador as unknown as PublicadorComandos,
    notificador as unknown as NotificadorStatusOS,
  );

  /** Simula o repositório: grava e chama a publicação antes do commit. */
  function gravaEPublica(status: StatusOrdemServico) {
    repositorio.findById.mockResolvedValue(ordemEm(status));
    repositorio.transicionarStatus.mockImplementation(
      async (
        _id: string,
        novoStatus: StatusOrdemServico,
        _tipo: string,
        _usuario: string,
        _obs: string,
        opcoes: OpcoesTransicao,
      ) => {
        const gravada = ordemEm(novoStatus);
        await opcoes.antesDoCommit?.(gravada);
        return gravada;
      },
    );
  }

  /** A chamada a transicionarStatus, sem a função de publicação. */
  function transicao() {
    const [id, para, tipo, usuario, observacao, opcoes] = repositorio
      .transicionarStatus.mock.calls[0] as [
      string,
      StatusOrdemServico,
      string,
      string,
      string,
      OpcoesTransicao,
    ];
    const { antesDoCommit, ...resto } = opcoes;
    return {
      id,
      para,
      tipo,
      usuario,
      observacao,
      opcoes: resto,
      publica: antesDoCommit !== undefined,
    };
  }

  function publicados() {
    return publicador.publicar.mock.calls.map(
      ([envelope]: [Envelope]) => envelope,
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();
    publicador.publicar.mockResolvedValue(undefined);
  });

  describe('diagnóstico', () => {
    it('DiagnosticoIniciado: RECEBIDA → EM_DIAGNOSTICO, com o criador da OS e o Execution como ator', async () => {
      gravaEPublica('RECEBIDA');

      await useCase.execute(
        resposta('DiagnosticoIniciado', { iniciadoEm: 'x' }),
      );

      expect(transicao()).toEqual({
        id: OS_ID,
        para: 'EM_DIAGNOSTICO',
        tipo: 'AVANCO',
        usuario: 'criador-1',
        observacao: 'Execution: diagnóstico iniciado pelo mecânico',
        opcoes: { statusEsperados: ['RECEBIDA'] },
        publica: false,
      });
    });

    it('DiagnosticoConcluido: trava as linhas e pede o orçamento com a cópia delas', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('EM_DIAGNOSTICO'));
      const snapshot: SnapshotOrcamento = {
        ordem: ordemEm('EM_DIAGNOSTICO'),
        cliente: { id: 'cliente-1', nome: 'Maria', email: null },
        servicos: [
          {
            servicoId: 'srv-1',
            nome: 'Troca de óleo',
            precoUnitario: 120,
            quantidade: 1,
            subtotal: 120,
          },
        ],
        itens: [
          {
            itemEstoqueId: 'item-1',
            nome: 'Filtro de óleo',
            precoUnitario: 15.1,
            quantidade: 2,
            subtotal: 30.2,
          },
        ],
      };
      repositorio.concluirDiagnostico.mockImplementation(
        async (
          _id: string,
          publicar: (s: SnapshotOrcamento) => Promise<void>,
        ) => {
          await publicar(snapshot);
          return true;
        },
      );

      await useCase.execute(resposta('DiagnosticoConcluido'));

      expect(repositorio.concluirDiagnostico).toHaveBeenCalledWith(
        OS_ID,
        expect.any(Function),
      );
      expect(publicados()).toEqual([
        expect.objectContaining({
          tipo: 'GerarOrcamento',
          osId: OS_ID,
          correlationId: 'fluxo-da-os',
          payload: {
            codigo: 'OS-2026-000001',
            cliente: snapshot.cliente,
            servicos: snapshot.servicos,
            itens: snapshot.itens,
            valorServicos: 120,
            valorPecas: 30.2,
            valorTotal: 150.2,
          },
        }),
      ]);
      expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
    });

    it('DiagnosticoConcluido repetido não publica de novo', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('EM_DIAGNOSTICO'));
      repositorio.concluirDiagnostico.mockResolvedValue(false);

      await useCase.execute(resposta('DiagnosticoConcluido'));

      expect(publicador.publicar).not.toHaveBeenCalled();
    });
  });

  describe('orçamento', () => {
    it('OrcamentoEnviado: EM_DIAGNOSTICO → AGUARDANDO_APROVACAO, com o valor no histórico', async () => {
      gravaEPublica('EM_DIAGNOSTICO');

      await useCase.execute(
        resposta('OrcamentoEnviado', {
          orcamentoId: 'orc-1',
          valorTotal: 150.2,
        }),
      );

      expect(transicao()).toMatchObject({
        para: 'AGUARDANDO_APROVACAO',
        tipo: 'AVANCO',
        opcoes: { statusEsperados: ['EM_DIAGNOSTICO'] },
      });
      expect(transicao().observacao).toMatch(
        /^Billing: orçamento enviado ao cliente \(R\$\s150,20\)$/,
      );
    });

    it('GeracaoOrcamentoFalhou: compensa — cancela a OS e devolve o estoque', async () => {
      gravaEPublica('EM_DIAGNOSTICO');

      await useCase.execute(
        resposta('GeracaoOrcamentoFalhou', { motivo: 'ORCAMENTO_VAZIO' }),
      );

      expect(transicao()).toEqual(
        expect.objectContaining({
          para: 'CANCELADA',
          tipo: 'COMPENSACAO',
          observacao: 'Billing: Falha ao gerar o orçamento: ORCAMENTO_VAZIO',
          opcoes: {
            statusEsperados: ['EM_DIAGNOSTICO'],
            devolverEstoque: true,
            motivoCancelamento: 'Falha ao gerar o orçamento: ORCAMENTO_VAZIO',
          },
          publica: false,
        }),
      );
    });

    it.each([
      ['CLIENTE', 'Billing: orçamento aprovado pelo cliente'],
      ['SISTEMA_EXTERNO', 'Billing: orçamento aprovado pelo sistema externo'],
    ])(
      'OrcamentoAprovado (%s): AGUARDANDO_APROVACAO → AGUARDANDO_PAGAMENTO',
      async (origem, observacao) => {
        gravaEPublica('AGUARDANDO_APROVACAO');

        await useCase.execute(
          resposta('OrcamentoAprovado', { orcamentoId: 'orc-1', origem }),
        );

        expect(transicao()).toMatchObject({
          para: 'AGUARDANDO_PAGAMENTO',
          observacao,
        });
      },
    );

    it('OrcamentoRecusado: compensa — cancela com o motivo e devolve o estoque, sem comando ao Billing', async () => {
      gravaEPublica('AGUARDANDO_APROVACAO');

      await useCase.execute(
        resposta('OrcamentoRecusado', {
          orcamentoId: 'orc-1',
          origem: 'CLIENTE',
          motivo: 'Valor acima do esperado',
        }),
      );

      expect(transicao()).toMatchObject({
        para: 'CANCELADA',
        tipo: 'COMPENSACAO',
        opcoes: {
          devolverEstoque: true,
          motivoCancelamento:
            'Orçamento recusado pelo cliente: Valor acima do esperado',
        },
        publica: false,
      });
    });

    it('OrcamentoRecusado sem motivo', async () => {
      gravaEPublica('AGUARDANDO_APROVACAO');

      await useCase.execute(
        resposta('OrcamentoRecusado', {
          origem: 'SISTEMA_EXTERNO',
          motivo: null,
        }),
      );

      expect(transicao().opcoes.motivoCancelamento).toBe(
        'Orçamento recusado pelo sistema externo',
      );
    });
  });

  describe('pagamento', () => {
    it('PagamentoConfirmado: AGUARDANDO_PAGAMENTO → EM_EXECUCAO e o reparo entra na fila do mecânico', async () => {
      gravaEPublica('AGUARDANDO_PAGAMENTO');
      repositorio.findByIdComDetalhes.mockResolvedValue(detalhes);

      await useCase.execute(
        resposta('PagamentoConfirmado', {
          pagamentoId: '9101',
          valor: 150.2,
          pagoEm: '2026-10-20T14:30:00.000Z',
        }),
      );

      expect(transicao()).toMatchObject({
        para: 'EM_EXECUCAO',
        tipo: 'AVANCO',
        publica: true,
      });
      expect(transicao().observacao).toMatch(
        /^Billing: pagamento confirmado no Mercado Pago \(9101, R\$\s150,20\)$/,
      );
      expect(publicados()).toEqual([
        expect.objectContaining({
          tipo: 'IniciarReparo',
          correlationId: 'fluxo-da-os',
          payload: {
            codigo: 'OS-2026-000001',
            veiculo: {
              placa: 'ABC1D23',
              marca: 'Fiat',
              modelo: 'Uno',
              ano: 2020,
            },
            servicos: [{ nome: 'Troca de óleo', quantidade: 1 }],
            itens: [{ nome: 'Filtro de óleo', quantidade: 2 }],
          },
        }),
      ]);
    });

    it('PagamentoConfirmado sem dados do pagamento: observação sem parênteses', async () => {
      gravaEPublica('AGUARDANDO_PAGAMENTO');
      repositorio.findByIdComDetalhes.mockResolvedValue(detalhes);

      await useCase.execute(resposta('PagamentoConfirmado'));

      expect(transicao().observacao).toBe(
        'Billing: pagamento confirmado no Mercado Pago',
      );
    });

    it('PagamentoConfirmado com a OS já cancelada: descarta (o Billing estorna no CancelarOrcamento)', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('CANCELADA'));

      await useCase.execute(resposta('PagamentoConfirmado', { valor: 10 }));

      expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
      expect(publicador.publicar).not.toHaveBeenCalled();
    });

    it('PagamentoRecusado é informativo: registra no histórico e a OS continua aguardando pagamento', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('AGUARDANDO_PAGAMENTO'));

      await useCase.execute(
        resposta('PagamentoRecusado', { detalhe: 'cc_rejected_other_reason' }),
      );

      expect(repositorio.registrarNoHistorico).toHaveBeenCalledWith(
        OS_ID,
        'criador-1',
        'Billing: pagamento recusado (cc_rejected_other_reason); o cliente pode tentar de novo pelo mesmo link',
      );
      expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
    });

    it('PagamentoEstornado numa OS cancelada: registra no histórico', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('CANCELADA'));

      await useCase.execute(
        resposta('PagamentoEstornado', { pagamentoId: '9101' }),
      );

      expect(repositorio.registrarNoHistorico).toHaveBeenCalledWith(
        OS_ID,
        'criador-1',
        'Billing: pagamento 9101 estornado ao cliente',
      );
    });

    it('PagamentoEstornado numa OS que não está cancelada: descarta', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('EM_EXECUCAO'));

      await useCase.execute(resposta('PagamentoEstornado'));

      expect(repositorio.registrarNoHistorico).not.toHaveBeenCalled();
    });
  });

  describe('reparo', () => {
    it('ReparoConcluido: EM_EXECUCAO → FINALIZADA e o cliente é avisado', async () => {
      gravaEPublica('EM_EXECUCAO');

      await useCase.execute(resposta('ReparoConcluido', { concluidoEm: 'x' }));

      expect(transicao()).toMatchObject({
        para: 'FINALIZADA',
        tipo: 'AVANCO',
        observacao: 'Execution: reparo concluído',
      });
      expect(notificador.notificar).toHaveBeenCalledWith(OS_ID, 'FINALIZADA');
    });

    it.each<StatusOrdemServico>(['RECEBIDA', 'EM_DIAGNOSTICO'])(
      'ExecucaoFalhou no diagnóstico (OS em %s): compensa — cancela e devolve o estoque',
      async (status) => {
        gravaEPublica(status);

        await useCase.execute(
          resposta('ExecucaoFalhou', {
            etapa: 'DIAGNOSTICO',
            motivo: 'Veículo não liga',
          }),
        );

        expect(transicao()).toMatchObject({
          para: 'CANCELADA',
          tipo: 'COMPENSACAO',
          observacao: 'Execution: Falha no diagnóstico: Veículo não liga',
          opcoes: { statusEsperados: [status], devolverEstoque: true },
          publica: false,
        });
      },
    );

    it('ExecucaoFalhou no reparo: compensa — cancela, devolve o estoque e pede o estorno ao Billing', async () => {
      gravaEPublica('EM_EXECUCAO');

      await useCase.execute(
        resposta('ExecucaoFalhou', {
          etapa: 'REPARO',
          motivo: 'Peça indisponível',
        }),
      );

      expect(transicao()).toMatchObject({
        para: 'CANCELADA',
        opcoes: {
          devolverEstoque: true,
          motivoCancelamento: 'Falha no reparo: Peça indisponível',
        },
        publica: true,
      });
      expect(publicados()).toEqual([
        expect.objectContaining({
          tipo: 'EstornarPagamento',
          payload: { motivo: 'Falha no reparo: Peça indisponível' },
        }),
      ]);
    });

    it('ExecucaoFalhou sem motivo usa um texto padrão', async () => {
      gravaEPublica('RECEBIDA');

      await useCase.execute(
        resposta('ExecucaoFalhou', { etapa: 'DIAGNOSTICO' }),
      );

      expect(transicao().opcoes.motivoCancelamento).toBe(
        'Falha no diagnóstico: motivo não informado',
      );
    });

    it('ExecucaoFalhou com etapa inválida: descarta', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('EM_EXECUCAO'));

      await useCase.execute(resposta('ExecucaoFalhou', { etapa: 'PINTURA' }));

      expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
    });

    it('ExecucaoFalhou do reparo com a OS em diagnóstico: fora de hora, descarta', async () => {
      repositorio.findById.mockResolvedValue(ordemEm('EM_DIAGNOSTICO'));

      await useCase.execute(resposta('ExecucaoFalhou', { etapa: 'REPARO' }));

      expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
    });
  });

  describe('mensagens que não mudam nada', () => {
    it.each<[string, StatusOrdemServico]>([
      ['DiagnosticoIniciado', 'EM_DIAGNOSTICO'],
      ['DiagnosticoConcluido', 'AGUARDANDO_APROVACAO'],
      ['OrcamentoEnviado', 'AGUARDANDO_APROVACAO'],
      ['GeracaoOrcamentoFalhou', 'CANCELADA'],
      ['OrcamentoAprovado', 'AGUARDANDO_PAGAMENTO'],
      ['OrcamentoRecusado', 'CANCELADA'],
      ['PagamentoRecusado', 'EM_EXECUCAO'],
      ['ReparoConcluido', 'FINALIZADA'],
    ])(
      '%s repetida ou atrasada (OS em %s) é descartada sem erro',
      async (tipo, status) => {
        repositorio.findById.mockResolvedValue(ordemEm(status));

        await expect(useCase.execute(resposta(tipo))).resolves.toBeUndefined();

        expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
        expect(repositorio.concluirDiagnostico).not.toHaveBeenCalled();
        expect(repositorio.registrarNoHistorico).not.toHaveBeenCalled();
        expect(publicador.publicar).not.toHaveBeenCalled();
      },
    );

    it('tipo desconhecido é descartado sem consultar a OS', async () => {
      await useCase.execute(resposta('IniciarDiagnostico'));

      expect(repositorio.findById).not.toHaveBeenCalled();
    });

    it('OS desconhecida é descartada', async () => {
      repositorio.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(resposta('DiagnosticoIniciado')),
      ).resolves.toBeUndefined();
      expect(repositorio.transicionarStatus).not.toHaveBeenCalled();
    });
  });

  it('outra ação mudou a OS no meio: o erro devolve a mensagem para a fila', async () => {
    repositorio.findById.mockResolvedValue(ordemEm('RECEBIDA'));
    repositorio.transicionarStatus.mockRejectedValue(
      new OrdemServicoAlteradaError(OS_ID, ['RECEBIDA']),
    );

    await expect(
      useCase.execute(resposta('DiagnosticoIniciado')),
    ).rejects.toBeInstanceOf(OrdemServicoAlteradaError);
  });
});
