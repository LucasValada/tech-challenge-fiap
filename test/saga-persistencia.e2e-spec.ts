import request from 'supertest';
import { OrdemServicoAlteradaError } from '../src/modules/ordem-servico/domain/errors';
import {
  OrdemServicoRepository,
  SnapshotOrcamento,
} from '../src/modules/ordem-servico/domain/repository/ordem-servico.repository';
import { E2eContext, authHeader, authRequest, setupE2e } from './setup-e2e';

/**
 * Persistência da Saga contra o PostgreSQL real: o que o orquestrador vai usar
 * para avançar e compensar a OS (docs/contratos.md, seções 1 e 6).
 */
describe('Saga — persistência da OS (e2e)', () => {
  let ctx: E2eContext;
  let repositorio: OrdemServicoRepository;
  let clienteId: string;
  let veiculoId: string;
  let servicoId: string;
  let itemEstoqueId: string;
  let osId: string;
  const osParaApagar: string[] = [];

  async function estoqueAtual(): Promise<number> {
    const res = await authRequest(
      ctx,
      'get',
      `/itens-estoque/${itemEstoqueId}`,
    ).expect(200);
    return res.body.quantidadeEstoque as number;
  }

  async function detalhe() {
    const res = await authRequest(ctx, 'get', `/ordens-servico/${osId}`).expect(
      200,
    );
    return res.body as {
      status: string;
      correlationId: string;
      diagnosticoConcluidoAt: string | null;
      canceladaAt: string | null;
      motivoCancelamento: string | null;
      historicoStatus: { status: string; observacao: string | null }[];
      itens: { id: string }[];
      usuarioCriador: { id: string };
    };
  }

  /** Transições da Saga gravam o histórico com o criador da OS (ADR-001). */
  async function criador(): Promise<string> {
    return (await detalhe()).usuarioCriador.id;
  }

  beforeAll(async () => {
    ctx = await setupE2e();
    repositorio = ctx.app.get('ORDEM_SERVICO_REPOSITORY', { strict: false });

    clienteId = (
      await authRequest(ctx, 'post', '/cliente').send({
        nome: 'E2E Saga Cliente',
        telefone: '(11)988887777',
        email: 'e2e-saga@teste.com',
        cpfCnpj: '418.236.957-28',
        tipoPessoa: 'FISICA',
      })
    ).body.id;
    veiculoId = (
      await authRequest(ctx, 'post', '/veiculos').send({
        placa: 'SAG1A01',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2020,
        clienteId,
      })
    ).body.id;
    servicoId = (
      await authRequest(ctx, 'post', '/servicos').send({
        nome: `E2E Saga Revisão ${Date.now()}`,
        precoBase: 120,
        tempoEstimadoMin: 60,
      })
    ).body.id;
    itemEstoqueId = (
      await authRequest(ctx, 'post', '/itens-estoque').send({
        nome: 'E2E Saga Filtro',
        tipo: 'PECA',
        sku: `E2E-SAGA-${Date.now()}`,
        precoUnitario: 15.1,
        quantidadeEstoque: 10,
        estoqueMinimo: 1,
      })
    ).body.id;
  });

  afterAll(async () => {
    for (const id of osParaApagar) {
      await authRequest(ctx, 'delete', `/ordens-servico/${id}`);
    }
    await authRequest(ctx, 'delete', `/itens-estoque/${itemEstoqueId}`);
    await authRequest(ctx, 'delete', `/servicos/${servicoId}`);
    await authRequest(ctx, 'delete', `/veiculos/${veiculoId}`);
    await authRequest(ctx, 'delete', `/cliente/delete/${clienteId}`);
    await ctx.app.close();
  });

  it('a abertura guarda o x-correlation-id da requisição como fluxo da OS', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/ordens-servico')
      .set(authHeader(ctx.token))
      .set('x-correlation-id', 'fluxo-e2e-saga')
      .send({
        cpfCnpj: '418.236.957-28',
        placa: 'SAG1A01',
        servicos: [{ servicoId, quantidade: 1 }],
        itens: [{ itemEstoqueId, quantidade: 2 }],
      })
      .expect(201);
    osId = res.body.id;
    osParaApagar.push(osId);

    expect((await detalhe()).correlationId).toBe('fluxo-e2e-saga');
    expect(await estoqueAtual()).toBe(8);
  });

  it('sem o header, a OS ganha um correlationId próprio', async () => {
    const res = await authRequest(ctx, 'post', '/ordens-servico')
      .send({ cpfCnpj: '418.236.957-28', placa: 'SAG1A01' })
      .expect(201);
    osParaApagar.push(res.body.id);

    const outra = await authRequest(
      ctx,
      'get',
      `/ordens-servico/${res.body.id}`,
    ).expect(200);
    expect(outra.body.correlationId).toEqual(expect.any(String));
    expect(outra.body.correlationId).not.toBe('fluxo-e2e-saga');
  });

  it('a mensagem é publicada dentro da transação: se a publicação falha, nada é gravado', async () => {
    await expect(
      repositorio.transicionarStatus(
        osId,
        'EM_DIAGNOSTICO',
        'AVANCO',
        await criador(),
        'Execution: diagnóstico iniciado',
        {
          statusEsperados: ['RECEBIDA'],
          antesDoCommit: () => Promise.reject(new Error('SQS fora')),
        },
      ),
    ).rejects.toThrow('SQS fora');

    const os = await detalhe();
    expect(os.status).toBe('RECEBIDA');
    expect(os.historicoStatus).toHaveLength(1);
  });

  it('transiciona só a partir do status esperado e entrega a OS gravada para a publicação', async () => {
    const publicadas: string[] = [];

    const ordem = await repositorio.transicionarStatus(
      osId,
      'EM_DIAGNOSTICO',
      'AVANCO',
      await criador(),
      'Execution: diagnóstico iniciado',
      {
        statusEsperados: ['RECEBIDA'],
        antesDoCommit: (gravada) => {
          publicadas.push(`${gravada.status}:${gravada.correlationId}`);
          return Promise.resolve();
        },
      },
    );

    expect(ordem.status).toBe('EM_DIAGNOSTICO');
    expect(publicadas).toEqual(['EM_DIAGNOSTICO:fluxo-e2e-saga']);

    // A mesma resposta de novo (o SQS entrega pelo menos uma vez).
    await expect(
      repositorio.transicionarStatus(
        osId,
        'EM_DIAGNOSTICO',
        'AVANCO',
        await criador(),
        'repetida',
        { statusEsperados: ['RECEBIDA'] },
      ),
    ).rejects.toBeInstanceOf(OrdemServicoAlteradaError);
    expect((await detalhe()).historicoStatus).toHaveLength(2);
  });

  it('concluir o diagnóstico trava as linhas e entrega a cópia para o orçamento, uma vez só', async () => {
    let snapshot: SnapshotOrcamento | undefined;

    const concluiu = await repositorio.concluirDiagnostico(osId, (s) => {
      snapshot = s;
      return Promise.resolve();
    });
    const repetida = await repositorio.concluirDiagnostico(osId, () =>
      Promise.reject(new Error('não deveria publicar de novo')),
    );

    expect(concluiu).toBe(true);
    expect(repetida).toBe(false);
    expect(snapshot).toMatchObject({
      ordem: { id: osId, correlationId: 'fluxo-e2e-saga' },
      cliente: { id: clienteId, email: 'e2e-saga@teste.com' },
      servicos: [
        { servicoId, precoUnitario: 120, quantidade: 1, subtotal: 120 },
      ],
      itens: [
        { itemEstoqueId, precoUnitario: 15.1, quantidade: 2, subtotal: 30.2 },
      ],
    });
    expect((await detalhe()).diagnosticoConcluidoAt).not.toBeNull();
  });

  it('com as linhas travadas, lançar ou remover serviço e item responde 409 e o estoque não muda', async () => {
    await authRequest(ctx, 'post', `/ordens-servico/${osId}/servicos`)
      .send({ servicoId, quantidade: 1 })
      .expect(409);
    await authRequest(ctx, 'post', `/ordens-servico/${osId}/itens-estoque`)
      .send({ itemEstoqueId, quantidade: 1 })
      .expect(409);
    const linhaItem = (await detalhe()).itens[0].id;
    await authRequest(
      ctx,
      'delete',
      `/ordens-servico/${osId}/itens-estoque/${linhaItem}`,
    ).expect(409);

    expect(await estoqueAtual()).toBe(8);
  });

  it('registra no histórico sem mudar o status', async () => {
    await repositorio.registrarNoHistorico(
      osId,
      await criador(),
      'Billing: pagamento recusado (cc_rejected_other_reason)',
    );

    const os = await detalhe();
    expect(os.status).toBe('EM_DIAGNOSTICO');
    expect(os.historicoStatus.at(-1)).toMatchObject({
      status: 'EM_DIAGNOSTICO',
      observacao: 'Billing: pagamento recusado (cc_rejected_other_reason)',
    });
  });

  it('a compensação cancela a OS, grava o motivo e devolve o estoque', async () => {
    await repositorio.transicionarStatus(
      osId,
      'CANCELADA',
      'COMPENSACAO',
      await criador(),
      'Billing: falha ao gerar o orçamento',
      {
        statusEsperados: ['EM_DIAGNOSTICO'],
        devolverEstoque: true,
        motivoCancelamento: 'GERACAO_ORCAMENTO_FALHOU',
      },
    );

    const os = await detalhe();
    expect(os).toMatchObject({
      status: 'CANCELADA',
      motivoCancelamento: 'GERACAO_ORCAMENTO_FALHOU',
    });
    expect(os.canceladaAt).not.toBeNull();
    expect(await estoqueAtual()).toBe(10);

    const lista = await authRequest(ctx, 'get', '/ordens-servico').expect(200);
    const ids = (lista.body.ordens as { id: string }[]).map((o) => o.id);
    expect(ids).not.toContain(osId);
  });
});
