import {
  E2eContext,
  setupE2e,
  authRequest,
  expectNotFound,
  expectUnauthorized,
} from './setup-e2e';

describe('Veículos (e2e)', () => {
  let ctx: E2eContext;
  let clienteId: string;
  let veiculoId: string;

  beforeAll(async () => {
    ctx = await setupE2e();

    const clienteRes = await authRequest(ctx, 'post', '/cliente').send({
      nome: 'E2E Veiculo Cliente',
      telefone: '(11)999999999',
      email: 'e2e-veiculo@teste.com',
      cpfCnpj: '611.718.412-30',
      tipoPessoa: 'FISICA',
    });
    clienteId = clienteRes.body.id;
  });

  afterAll(async () => {
    if (veiculoId) {
      await authRequest(ctx, 'delete', `/veiculos/${veiculoId}`);
    }
    if (clienteId) {
      await authRequest(ctx, 'delete', `/cliente/delete/${clienteId}`);
    }
    await ctx.app.close();
  });

  it('POST /veiculos — cria veículo', async () => {
    const res = await authRequest(ctx, 'post', '/veiculos')
      .send({
        placa: 'VEI1C23',
        marca: 'Honda',
        modelo: 'Civic',
        ano: 2022,
        clienteId,
      })
      .expect(201);

    veiculoId = res.body.id;
    expect(res.body.placa).toBe('VEI1C23');
    expect(res.body.marca).toBe('Honda');
  });

  it('GET /veiculos — lista veículos', async () => {
    const res = await authRequest(ctx, 'get', '/veiculos').expect(200);

    expect(res.body.veiculo).toBeInstanceOf(Array);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /veiculos/:id — busca por ID', async () => {
    const res = await authRequest(ctx, 'get', `/veiculos/${veiculoId}`).expect(
      200,
    );

    expect(res.body.id).toBe(veiculoId);
  });

  it('PUT /veiculos/:id — atualiza veículo', async () => {
    const res = await authRequest(ctx, 'put', `/veiculos/${veiculoId}`)
      .send({ marca: 'Honda', modelo: 'Civic Touring', ano: 2023 })
      .expect(200);

    expect(res.body.modelo).toBe('Civic Touring');
  });

  it('GET /veiculos/:id — 404 para ID inexistente', async () => {
    await expectNotFound(ctx, '/veiculos');
  });

  it('GET /veiculos — 401 sem token', async () => {
    await expectUnauthorized(ctx, '/veiculos');
  });

  it('DELETE /veiculos/:id — deleta veículo', async () => {
    await authRequest(ctx, 'delete', `/veiculos/${veiculoId}`).expect(204);

    veiculoId = undefined;
  });
});
