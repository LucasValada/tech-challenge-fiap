import {
  E2eContext,
  setupE2e,
  authRequest,
  publicRequest,
} from './setup-e2e';

describe('Ordem de Serviço — fluxo completo (e2e)', () => {
  let ctx: E2eContext;
  let clienteId: string;
  let veiculoId: string;
  let servicoId: string;
  let itemEstoqueId: string;
  let osId: string;
  let osCodigo: string;
  const skuUnico = `E2E-OS-${Date.now()}`;

  beforeAll(async () => {
    ctx = await setupE2e();

    const clienteRes = await authRequest(ctx, 'post', '/cliente').send({
      nome: 'E2E OS Cliente',
      telefone: '(11)999999999',
      email: 'e2e-os@teste.com',
      cpfCnpj: '999.888.777-66',
      tipoPessoa: 'FISICA',
    });
    if (clienteRes.status !== 201) {
      throw new Error(
        `Setup cliente falhou: ${clienteRes.status} ${JSON.stringify(clienteRes.body)}`,
      );
    }
    clienteId = clienteRes.body.id;

    const veiculoRes = await authRequest(ctx, 'post', '/veiculos').send({
      placa: 'TST1A99',
      marca: 'Fiat',
      modelo: 'Uno',
      ano: 2020,
      clienteId,
    });
    veiculoId = veiculoRes.body.id;

    const servicoRes = await authRequest(ctx, 'post', '/servicos').send({
      nome: 'E2E Troca de óleo',
      precoBase: 150.0,
      tempoEstimadoMin: 30,
    });
    servicoId = servicoRes.body.id;

    const itemRes = await authRequest(ctx, 'post', '/itens-estoque').send({
      nome: 'E2E Pastilha de freio',
      tipo: 'PECA',
      sku: skuUnico,
      precoUnitario: 80.0,
      quantidadeEstoque: 20,
      estoqueMinimo: 5,
    });
    itemEstoqueId = itemRes.body.id;
  });

  afterAll(async () => {
    if (osId) {
      await authRequest(ctx, 'delete', `/ordens-servico/${osId}`);
    }
    if (itemEstoqueId) {
      await authRequest(ctx, 'delete', `/itens-estoque/${itemEstoqueId}`);
    }
    if (servicoId) {
      await authRequest(ctx, 'delete', `/servicos/${servicoId}`);
    }
    if (veiculoId) {
      await authRequest(ctx, 'delete', `/veiculos/${veiculoId}`);
    }
    if (clienteId) {
      await authRequest(ctx, 'delete', `/cliente/delete/${clienteId}`);
    }
    await ctx.app.close();
  });

  it('POST /ordens-servico — cria OS por CPF + placa', async () => {
    const res = await authRequest(ctx, 'post', '/ordens-servico')
      .send({
        cpfCnpj: '999.888.777-66',
        placa: 'TST1A99',
        observacoes: 'Teste e2e',
      })
      .expect(201);

    osId = res.body.id;
    osCodigo = res.body.codigo;
    expect(res.body.status).toBe('RECEBIDA');
    expect(res.body.codigo).toMatch(/^OS-/);
  });

  it('GET /ordens-servico — lista OS', async () => {
    const res = await authRequest(ctx, 'get', '/ordens-servico').expect(200);

    expect(res.body.ordens).toBeInstanceOf(Array);
  });

  it('GET /ordens-servico/:id — detalhes da OS', async () => {
    const res = await authRequest(
      ctx,
      'get',
      `/ordens-servico/${osId}`,
    ).expect(200);

    expect(res.body.id).toBe(osId);
    expect(res.body.cliente).toBeDefined();
    expect(res.body.veiculo).toBeDefined();
  });

  it('POST /ordens-servico/:id/servicos — adiciona serviço à OS', async () => {
    const res = await authRequest(
      ctx,
      'post',
      `/ordens-servico/${osId}/servicos`,
    )
      .send({ servicoId, quantidade: 1 })
      .expect(201);

    expect(res.body.servicoId).toBe(servicoId);
  });

  it('POST /ordens-servico/:id/itens-estoque — adiciona item e baixa estoque', async () => {
    const res = await authRequest(
      ctx,
      'post',
      `/ordens-servico/${osId}/itens-estoque`,
    )
      .send({ itemEstoqueId, quantidade: 3 })
      .expect(201);

    expect(res.body.itemEstoqueId).toBe(itemEstoqueId);
    expect(res.body.quantidade).toBe(3);

    const itemRes = await authRequest(
      ctx,
      'get',
      `/itens-estoque/${itemEstoqueId}`,
    ).expect(200);

    expect(itemRes.body.quantidadeEstoque).toBe(17);
  });

  it('DELETE /ordens-servico/:id/itens-estoque/:linhaId — remove item e restitui estoque', async () => {
    const detalhes = await authRequest(
      ctx,
      'get',
      `/ordens-servico/${osId}`,
    ).expect(200);

    const linhaItemId = detalhes.body.itens[0].id;

    await authRequest(
      ctx,
      'delete',
      `/ordens-servico/${osId}/itens-estoque/${linhaItemId}`,
    ).expect(204);

    const itemRes = await authRequest(
      ctx,
      'get',
      `/itens-estoque/${itemEstoqueId}`,
    ).expect(200);

    expect(itemRes.body.quantidadeEstoque).toBe(20);
  });

  it('POST transicao-status — RECEBIDA → EM_DIAGNOSTICO', async () => {
    const res = await authRequest(
      ctx,
      'post',
      `/ordens-servico/${osId}/transicao-status`,
    )
      .send({ status: 'EM_DIAGNOSTICO', observacao: 'Iniciando diagnóstico' })
      .expect(200);

    expect(res.body.status).toBe('EM_DIAGNOSTICO');
  });

  it('POST enviar-orcamento — EM_DIAGNOSTICO → AGUARDANDO_APROVACAO', async () => {
    const res = await authRequest(
      ctx,
      'post',
      `/ordens-servico/${osId}/enviar-orcamento`,
    ).expect(200);

    expect(res.body.status).toBe('AGUARDANDO_APROVACAO');
    expect(res.body.valorTotal).toBeGreaterThan(0);
  });

  it('GET /public/ordens-servico/:codigo — consulta pública da OS', async () => {
    const res = await publicRequest(
      ctx,
      'get',
      `/public/ordens-servico/${osCodigo}?placa=TST1A99`,
    ).expect(200);

    expect(res.body.status).toBe('AGUARDANDO_APROVACAO');
    expect(res.body.codigo).toBe(osCodigo);
  });

  it('POST /public/ordens-servico/:codigo/aprovar — cliente aprova orçamento', async () => {
    const res = await publicRequest(
      ctx,
      'post',
      `/public/ordens-servico/${osCodigo}/aprovar`,
    )
      .send({ placa: 'TST1A99' })
      .expect(200);

    expect(res.body.status).toBe('EM_EXECUCAO');
  });

  it('POST transicao-status — EM_EXECUCAO → FINALIZADA', async () => {
    const res = await authRequest(
      ctx,
      'post',
      `/ordens-servico/${osId}/transicao-status`,
    )
      .send({ status: 'FINALIZADA' })
      .expect(200);

    expect(res.body.status).toBe('FINALIZADA');
  });

  it('POST transicao-status — FINALIZADA → ENTREGUE', async () => {
    const res = await authRequest(
      ctx,
      'post',
      `/ordens-servico/${osId}/transicao-status`,
    )
      .send({ status: 'ENTREGUE' })
      .expect(200);

    expect(res.body.status).toBe('ENTREGUE');
  });

  it('POST transicao-status — rejeita transição inválida em status terminal', async () => {
    await authRequest(
      ctx,
      'post',
      `/ordens-servico/${osId}/transicao-status`,
    )
      .send({ status: 'RECEBIDA' })
      .expect(409);
  });
});
