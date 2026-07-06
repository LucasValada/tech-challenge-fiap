import {
  E2eContext,
  setupE2e,
  authRequest,
  expectNotFound,
  expectUnauthorized,
} from './setup-e2e';

describe('Itens de Estoque (e2e)', () => {
  let ctx: E2eContext;
  let itemId: string;
  const skuUnico = `E2E-FLT-${Date.now()}`;

  beforeAll(async () => {
    ctx = await setupE2e();
  });

  afterAll(async () => {
    if (itemId) {
      await authRequest(ctx, 'delete', `/itens-estoque/${itemId}`);
    }
    await ctx.app.close();
  });

  it('POST /itens-estoque — cria item de estoque', async () => {
    const res = await authRequest(ctx, 'post', '/itens-estoque')
      .send({
        nome: 'E2E Filtro de ar',
        tipo: 'PECA',
        sku: skuUnico,
        descricao: 'Filtro de ar para teste e2e',
        precoUnitario: 35.9,
        quantidadeEstoque: 50,
        estoqueMinimo: 5,
      })
      .expect(201);

    itemId = res.body.id;
    expect(res.body.nome).toBe('E2E Filtro de ar');
    expect(res.body.tipo).toBe('PECA');
    expect(res.body.quantidadeEstoque).toBe(50);
  });

  it('GET /itens-estoque — lista itens', async () => {
    const res = await authRequest(ctx, 'get', '/itens-estoque').expect(200);

    expect(res.body.itemEstoque).toBeInstanceOf(Array);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /itens-estoque?tipo=PECA — filtra por tipo', async () => {
    const res = await authRequest(
      ctx,
      'get',
      '/itens-estoque?tipo=PECA',
    ).expect(200);

    expect(res.body.itemEstoque).toBeInstanceOf(Array);
    for (const item of res.body.itemEstoque) {
      expect(item.tipo).toBe('PECA');
    }
  });

  it('GET /itens-estoque/baixo-estoque — lista baixo estoque', async () => {
    const res = await authRequest(
      ctx,
      'get',
      '/itens-estoque/baixo-estoque',
    ).expect(200);

    expect(res.body.itemEstoque).toBeInstanceOf(Array);
    expect(typeof res.body.count).toBe('number');
  });

  it('GET /itens-estoque/:id — busca por ID', async () => {
    const res = await authRequest(
      ctx,
      'get',
      `/itens-estoque/${itemId}`,
    ).expect(200);

    expect(res.body.id).toBe(itemId);
  });

  it('PUT /itens-estoque/:id — atualiza item', async () => {
    const res = await authRequest(ctx, 'put', `/itens-estoque/${itemId}`)
      .send({ nome: 'E2E Filtro de ar Atualizado', precoUnitario: 40.0 })
      .expect(200);

    expect(res.body.nome).toBe('E2E Filtro de ar Atualizado');
  });

  it('GET /itens-estoque/:id — 404 para ID inexistente', async () => {
    await expectNotFound(ctx, '/itens-estoque');
  });

  it('GET /itens-estoque — 401 sem token', async () => {
    await expectUnauthorized(ctx, '/itens-estoque');
  });

  it('DELETE /itens-estoque/:id — deleta item', async () => {
    await authRequest(ctx, 'delete', `/itens-estoque/${itemId}`).expect(204);

    itemId = undefined;
  });
});
