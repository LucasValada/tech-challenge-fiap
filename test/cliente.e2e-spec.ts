import {
  E2eContext,
  setupE2e,
  authRequest,
  expectNotFound,
  expectUnauthorized,
} from './setup-e2e';

describe('Clientes (e2e)', () => {
  let ctx: E2eContext;
  let clienteId: string;

  beforeAll(async () => {
    ctx = await setupE2e();
  });

  afterAll(async () => {
    if (clienteId) {
      await authRequest(ctx, 'delete', `/cliente/delete/${clienteId}`);
    }
    await ctx.app.close();
  });

  it('POST /cliente — cria cliente', async () => {
    const res = await authRequest(ctx, 'post', '/cliente')
      .send({
        nome: 'E2E Cliente Teste',
        telefone: '(11)999999999',
        email: 'e2e-cliente@teste.com',
        cpfCnpj: '529.982.247-25',
        tipoPessoa: 'FISICA',
      })
      .expect(201);

    clienteId = res.body.id;
    expect(res.body.nome).toBe('E2E Cliente Teste');
    expect(res.body.cpfCnpj).toBeDefined();
  });

  it('GET /cliente — lista clientes', async () => {
    const res = await authRequest(ctx, 'get', '/cliente').expect(200);

    expect(res.body.client).toBeInstanceOf(Array);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /cliente/:id — busca por ID', async () => {
    const res = await authRequest(ctx, 'get', `/cliente/${clienteId}`).expect(
      200,
    );

    expect(res.body.id).toBe(clienteId);
  });

  it('PUT /cliente/update/:id — atualiza cliente', async () => {
    const res = await authRequest(ctx, 'put', `/cliente/update/${clienteId}`)
      .send({
        nome: 'E2E Cliente Atualizado',
        telefone: '(11)888888888',
        email: 'e2e-cliente@teste.com',
        cpfCnpj: '529.982.247-25',
        tipoPessoa: 'FISICA',
      })
      .expect(200);

    expect(res.body.nome).toBe('E2E Cliente Atualizado');
  });

  it('POST /cliente — rejeita CPF duplicado', async () => {
    const res = await authRequest(ctx, 'post', '/cliente').send({
      nome: 'Outro',
      telefone: '(11)999999999',
      email: 'outro-e2e@teste.com',
      cpfCnpj: '529.982.247-25',
      tipoPessoa: 'FISICA',
    });

    expect([400, 409]).toContain(res.status);
  });

  it('GET /cliente/:id — 404 para ID inexistente', async () => {
    await expectNotFound(ctx, '/cliente');
  });

  it('GET /cliente — 401 sem token', async () => {
    await expectUnauthorized(ctx, '/cliente');
  });

  it('DELETE /cliente/delete/:id — deleta cliente', async () => {
    await authRequest(ctx, 'delete', `/cliente/delete/${clienteId}`).expect(
      200,
    );

    clienteId = undefined;
  });
});
