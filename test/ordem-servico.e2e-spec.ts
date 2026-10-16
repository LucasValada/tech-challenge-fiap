import request from 'supertest';
import {
  E2eContext,
  authHeader,
  authRequest,
  clienteRequest,
  clienteToken,
  publicRequest,
  responderSaga,
  setupE2e,
} from './setup-e2e';
import { levarAte } from './helpers/os-fixtures';

/**
 * A OS como orquestrador da Saga, contra o PostgreSQL real. As respostas do
 * Billing e do Execution são simuladas na fronteira da fila (responderSaga), e
 * os comandos que o OS publica ficam em ctx.comandos.
 */
describe('Ordem de Serviço — Saga (e2e)', () => {
  let ctx: E2eContext;
  let clienteId: string;
  let servicoId: string;
  let itemEstoqueId: string;
  const cpf = '687.334.729-98';
  const placa = 'TST1A99';

  async function estoque(): Promise<number> {
    const res = await authRequest(
      ctx,
      'get',
      `/itens-estoque/${itemEstoqueId}`,
    ).expect(200);
    return res.body.quantidadeEstoque as number;
  }

  async function detalhe(osId: string) {
    const res = await authRequest(ctx, 'get', `/ordens-servico/${osId}`).expect(
      200,
    );
    return res.body as {
      status: string;
      codigo: string;
      motivoCancelamento: string | null;
      historicoStatus: { status: string; observacao: string | null }[];
      itens: { id: string }[];
    };
  }

  /** Abre uma OS com 1 serviço e 2 unidades do item de estoque. */
  async function abrirOS(): Promise<string> {
    const res = await authRequest(ctx, 'post', '/ordens-servico')
      .send({
        cpfCnpj: cpf,
        placa,
        servicos: [{ servicoId, quantidade: 1 }],
        itens: [{ itemEstoqueId, quantidade: 2 }],
      })
      .expect(201);
    return res.body.id as string;
  }

  beforeAll(async () => {
    ctx = await setupE2e();

    clienteId = (
      await authRequest(ctx, 'post', '/cliente').send({
        nome: 'E2E OS Cliente',
        telefone: '(11)999999999',
        email: 'e2e-os@teste.com',
        cpfCnpj: cpf,
        tipoPessoa: 'FISICA',
      })
    ).body.id;
    await authRequest(ctx, 'post', '/veiculos')
      .send({ placa, marca: 'Fiat', modelo: 'Uno', ano: 2020, clienteId })
      .expect(201);
    servicoId = (
      await authRequest(ctx, 'post', '/servicos').send({
        nome: 'E2E Troca de óleo',
        precoBase: 150.0,
        tempoEstimadoMin: 30,
      })
    ).body.id;
    itemEstoqueId = (
      await authRequest(ctx, 'post', '/itens-estoque').send({
        nome: 'E2E Pastilha de freio',
        tipo: 'PECA',
        sku: `E2E-OS-${Date.now()}`,
        precoUnitario: 80.0,
        quantidadeEstoque: 20,
        estoqueMinimo: 5,
      })
    ).body.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('caminho feliz: abertura → diagnóstico → orçamento → pagamento → reparo → entrega', () => {
    let osId: string;
    let osCodigo: string;

    it('a abertura cria a OS em RECEBIDA e põe o diagnóstico na fila do Execution', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/ordens-servico')
        .set(authHeader(ctx.token))
        .set('x-correlation-id', 'fluxo-e2e-os')
        .send({ cpfCnpj: cpf, placa, observacoes: 'Barulho no motor' })
        .expect(201);
      osId = res.body.id;
      osCodigo = res.body.codigo;

      expect(res.body.status).toBe('RECEBIDA');
      expect(ctx.comandos.da(osId)).toEqual([
        expect.objectContaining({
          tipo: 'IniciarDiagnostico',
          correlationId: 'fluxo-e2e-os',
          payload: {
            codigo: osCodigo,
            veiculo: { placa, marca: 'Fiat', modelo: 'Uno', ano: 2020 },
            observacoes: 'Barulho no motor',
          },
        }),
      ]);
    });

    it('o mecânico lança serviço e item (com baixa de estoque) antes e durante o diagnóstico', async () => {
      await authRequest(ctx, 'post', `/ordens-servico/${osId}/servicos`)
        .send({ servicoId, quantidade: 1 })
        .expect(201);
      await responderSaga(ctx, osId, 'DiagnosticoIniciado');
      expect((await detalhe(osId)).status).toBe('EM_DIAGNOSTICO');

      const antes = await estoque();
      await authRequest(ctx, 'post', `/ordens-servico/${osId}/itens-estoque`)
        .send({ itemEstoqueId, quantidade: 3 })
        .expect(201);
      expect(await estoque()).toBe(antes - 3);
    });

    it('no diagnóstico concluído, as linhas travam e o orçamento é pedido ao Billing com a cópia delas', async () => {
      await responderSaga(ctx, osId, 'DiagnosticoConcluido');

      const pedido = ctx.comandos
        .da(osId)
        .find((e) => e.tipo === 'GerarOrcamento');
      expect(pedido?.payload).toMatchObject({
        codigo: osCodigo,
        cliente: { id: clienteId, email: 'e2e-os@teste.com' },
        servicos: [{ servicoId, precoUnitario: 150, quantidade: 1 }],
        itens: [{ itemEstoqueId, precoUnitario: 80, quantidade: 3 }],
        valorServicos: 150,
        valorPecas: 240,
        valorTotal: 390,
      });

      await authRequest(ctx, 'post', `/ordens-servico/${osId}/servicos`)
        .send({ servicoId, quantidade: 1 })
        .expect(409);
    });

    it('com o orçamento enviado, o cliente e a consulta pública veem a OS aguardando aprovação', async () => {
      await responderSaga(ctx, osId, 'OrcamentoEnviado', {
        orcamentoId: 'orc-1',
        valorTotal: 390,
      });

      const publico = await publicRequest(
        ctx,
        'get',
        `/public/ordens-servico/${osCodigo}?placa=${placa}`,
      ).expect(200);
      expect(publico.body.status).toBe('AGUARDANDO_APROVACAO');

      const token = clienteToken(ctx, { id: clienteId, cpf, nome: 'E2E' });
      const minha = await clienteRequest(
        ctx,
        'get',
        `/ordens-servico/minhas/${osId}`,
        token,
      ).expect(200);
      expect(minha.body.status).toBe('AGUARDANDO_APROVACAO');

      await authRequest(ctx, 'get', `/ordens-servico/minhas/${osId}`).expect(
        403,
      );
    });

    it('a transição manual só aceita a entrega: as demais vêm da Saga', async () => {
      await authRequest(ctx, 'post', `/ordens-servico/${osId}/transicao-status`)
        .send({ status: 'EM_EXECUCAO' })
        .expect(409);
    });

    it('aprovado o orçamento, a OS espera o pagamento; a recusa de pagamento só vai para o histórico', async () => {
      await responderSaga(ctx, osId, 'OrcamentoAprovado', {
        orcamentoId: 'orc-1',
        origem: 'CLIENTE',
      });
      await responderSaga(ctx, osId, 'PagamentoRecusado', {
        detalhe: 'cc_rejected_other_reason',
      });

      const os = await detalhe(osId);
      expect(os.status).toBe('AGUARDANDO_PAGAMENTO');
      expect(os.historicoStatus.at(-1)?.observacao).toContain(
        'pagamento recusado (cc_rejected_other_reason)',
      );
    });

    it('pagamento confirmado: a OS vai para execução e o reparo entra na fila do Execution', async () => {
      await responderSaga(ctx, osId, 'PagamentoConfirmado', {
        pagamentoId: '9101',
        valor: 390,
      });

      expect((await detalhe(osId)).status).toBe('EM_EXECUCAO');
      const reparo = ctx.comandos
        .da(osId)
        .find((e) => e.tipo === 'IniciarReparo');
      expect(reparo?.payload).toMatchObject({
        codigo: osCodigo,
        servicos: [{ nome: 'E2E Troca de óleo', quantidade: 1 }],
        itens: [{ nome: 'E2E Pastilha de freio', quantidade: 3 }],
      });
    });

    it('reparo concluído finaliza a OS; a entrega é registrada pela API', async () => {
      await responderSaga(ctx, osId, 'ReparoConcluido');
      expect((await detalhe(osId)).status).toBe('FINALIZADA');

      await authRequest(ctx, 'post', `/ordens-servico/${osId}/transicao-status`)
        .send({ status: 'ENTREGUE' })
        .expect(200);

      const os = await detalhe(osId);
      expect(os.status).toBe('ENTREGUE');
      expect(os.historicoStatus.map((h) => h.status)).toEqual([
        'RECEBIDA',
        'EM_DIAGNOSTICO',
        'AGUARDANDO_APROVACAO',
        'AGUARDANDO_PAGAMENTO',
        'AGUARDANDO_PAGAMENTO',
        'EM_EXECUCAO',
        'FINALIZADA',
        'ENTREGUE',
      ]);
      expect(ctx.comandos.tiposDa(osId)).toEqual([
        'IniciarDiagnostico',
        'GerarOrcamento',
        'IniciarReparo',
      ]);
    });

    it('uma resposta repetida não muda nada', async () => {
      await responderSaga(ctx, osId, 'PagamentoConfirmado', {
        pagamentoId: '9101',
      });

      expect((await detalhe(osId)).status).toBe('ENTREGUE');
      expect(ctx.comandos.tiposDa(osId)).toHaveLength(3);
    });

    it('só OS cancelada pode ser excluída', async () => {
      await authRequest(ctx, 'delete', `/ordens-servico/${osId}`).expect(409);
    });
  });

  describe('compensações', () => {
    it('orçamento recusado: a OS é cancelada e o estoque volta', async () => {
      const antes = await estoque();
      const osId = await abrirOS();
      expect(await estoque()).toBe(antes - 2);
      await levarAte(ctx, osId, 'AGUARDANDO_APROVACAO');

      await responderSaga(ctx, osId, 'OrcamentoRecusado', {
        orcamentoId: 'orc-2',
        origem: 'CLIENTE',
        motivo: 'Valor acima do esperado',
      });

      const os = await detalhe(osId);
      expect(os.status).toBe('CANCELADA');
      expect(os.motivoCancelamento).toBe(
        'Orçamento recusado pelo cliente: Valor acima do esperado',
      );
      expect(await estoque()).toBe(antes);
      await authRequest(ctx, 'delete', `/ordens-servico/${osId}`).expect(204);
    });

    it('cancelamento pelo funcionário esperando pagamento: estoque volta e o Billing cancela o orçamento', async () => {
      const antes = await estoque();
      const osId = await abrirOS();
      await levarAte(ctx, osId, 'AGUARDANDO_PAGAMENTO');

      await authRequest(ctx, 'post', `/ordens-servico/${osId}/cancelar`)
        .send({ motivo: 'Cliente desistiu do pagamento' })
        .expect(200);

      expect((await detalhe(osId)).status).toBe('CANCELADA');
      expect(await estoque()).toBe(antes);
      expect(ctx.comandos.da(osId).at(-1)).toMatchObject({
        tipo: 'CancelarOrcamento',
        payload: { motivo: 'Cliente desistiu do pagamento' },
      });

      await authRequest(ctx, 'post', `/ordens-servico/${osId}/cancelar`)
        .send({ motivo: 'de novo' })
        .expect(409);
    });

    it('falha no reparo depois do pagamento: estoque volta e o Billing estorna', async () => {
      const antes = await estoque();
      const osId = await abrirOS();
      await levarAte(ctx, osId, 'EM_EXECUCAO');

      await responderSaga(ctx, osId, 'ExecucaoFalhou', {
        etapa: 'REPARO',
        motivo: 'Peça indisponível no fornecedor',
      });

      expect((await detalhe(osId)).status).toBe('CANCELADA');
      expect(await estoque()).toBe(antes);
      expect(ctx.comandos.da(osId).at(-1)).toMatchObject({
        tipo: 'EstornarPagamento',
        payload: { motivo: 'Falha no reparo: Peça indisponível no fornecedor' },
      });

      await responderSaga(ctx, osId, 'PagamentoEstornado', {
        pagamentoId: '9001',
      });
      expect((await detalhe(osId)).historicoStatus.at(-1)?.observacao).toBe(
        'Billing: pagamento 9001 estornado ao cliente',
      );
    });

    it('o funcionário não cancela OS em que o mecânico atua (409)', async () => {
      const osId = await abrirOS();

      await authRequest(ctx, 'post', `/ordens-servico/${osId}/cancelar`)
        .send({ motivo: 'qualquer' })
        .expect(409);
    });
  });

  it('as rotas de orçamento e aprovação saíram para o Billing', async () => {
    const qualquer = '00000000-0000-4000-8000-000000000000';
    const token = clienteToken(ctx, { id: clienteId, cpf, nome: 'E2E' });

    await authRequest(
      ctx,
      'post',
      `/ordens-servico/${qualquer}/enviar-orcamento`,
    ).expect(404);
    await clienteRequest(
      ctx,
      'post',
      `/ordens-servico/minhas/${qualquer}/aprovar`,
      token,
    ).expect(404);
    await publicRequest(ctx, 'post', '/webhooks/orcamento').expect(404);
  });
});
