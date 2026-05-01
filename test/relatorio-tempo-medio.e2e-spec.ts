import {
  E2eContext,
  setupE2e,
  authRequest,
  expectUnauthorized,
} from './setup-e2e';

describe('Relatório Tempo Médio (e2e)', () => {
  let ctx: E2eContext;
  const baseUrl = '/ordens-servico/relatorios/tempo-medio-servicos';

  beforeAll(async () => {
    ctx = await setupE2e();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET tempo-medio-servicos — retorna relatório sem filtros', async () => {
    const res = await authRequest(ctx, 'get', baseUrl).expect(200);

    expect(res.body).toHaveProperty('periodo');
    expect(res.body).toHaveProperty('totalOrdensConsideradas');
    expect(res.body).toHaveProperty('servicos');
    expect(res.body.periodo.dataInicio).toBeNull();
    expect(res.body.periodo.dataFim).toBeNull();
    expect(res.body.servicos).toBeInstanceOf(Array);
  });

  it('GET tempo-medio-servicos — filtra por período', async () => {
    const res = await authRequest(
      ctx,
      'get',
      `${baseUrl}?dataInicio=2026-01-01&dataFim=2026-12-31`,
    ).expect(200);

    expect(res.body.periodo.dataInicio).toBe('2026-01-01');
    expect(res.body.periodo.dataFim).toBe('2026-12-31');
  });

  it('GET tempo-medio-servicos — 400 quando dataInicio > dataFim', async () => {
    await authRequest(
      ctx,
      'get',
      `${baseUrl}?dataInicio=2026-12-31&dataFim=2026-01-01`,
    ).expect(400);
  });

  it('GET tempo-medio-servicos — 401 sem token', async () => {
    await expectUnauthorized(ctx, baseUrl);
  });
});
