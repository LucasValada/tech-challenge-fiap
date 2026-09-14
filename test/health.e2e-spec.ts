import { E2eContext, setupE2e, publicRequest } from './setup-e2e';

describe('Health (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await setupE2e();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /health — liveness responde 200 status ok (sem checar dependências)', async () => {
    const res = await publicRequest(ctx, 'get', '/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/ready — readiness responde 200 com database up', async () => {
    const res = await publicRequest(ctx, 'get', '/health/ready').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('up');
  });

  it('respostas incluem o header x-correlation-id (correlação de logs)', async () => {
    const res = await publicRequest(ctx, 'get', '/health').expect(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
  });
});
