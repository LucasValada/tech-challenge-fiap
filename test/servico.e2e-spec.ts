import {
  E2eContext,
  setupE2e,
  authRequest,
  expectNotFound,
  expectUnauthorized,
} from './setup-e2e';

describe('Serviços (e2e)', () => {
  let ctx: E2eContext;
  let servicoId: string;

  beforeAll(async () => {
    ctx = await setupE2e();
  });

  afterAll(async () => {
    if (servicoId) {
      await authRequest(ctx, 'delete', `/servicos/${servicoId}`);
    }
    await ctx.app.close();
  });

  it('POST /servicos — cria serviço', async () => {
    const res = await authRequest(ctx, 'post', '/servicos')
      .send({
        nome: 'E2E Alinhamento',
        descricao: 'Alinhamento de direção completo',
        precoBase: 120.0,
        tempoEstimadoMin: 45,
      })
      .expect(201);

    servicoId = res.body.id;
    expect(res.body.nome).toBe('E2E Alinhamento');
    expect(Number(res.body.precoBase)).toBe(120);
  });

  it('GET /servicos — lista serviços', async () => {
    const res = await authRequest(ctx, 'get', '/servicos').expect(200);

    expect(res.body.servico).toBeInstanceOf(Array);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /servicos/:id — busca por ID', async () => {
    const res = await authRequest(ctx, 'get', `/servicos/${servicoId}`).expect(
      200,
    );

    expect(res.body.id).toBe(servicoId);
  });

  it('PUT /servicos/:id — atualiza serviço', async () => {
    const res = await authRequest(ctx, 'put', `/servicos/${servicoId}`)
      .send({ nome: 'E2E Alinhamento Atualizado', precoBase: 130.0 })
      .expect(200);

    expect(res.body.nome).toBe('E2E Alinhamento Atualizado');
  });

  it('GET /servicos/:id — 404 para ID inexistente', async () => {
    await expectNotFound(ctx, '/servicos');
  });

  it('GET /servicos — 401 sem token', async () => {
    await expectUnauthorized(ctx, '/servicos');
  });

  it('DELETE /servicos/:id — deleta serviço', async () => {
    await authRequest(ctx, 'delete', `/servicos/${servicoId}`).expect(204);

    servicoId = undefined;
  });
});
