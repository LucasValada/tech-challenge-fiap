import request from 'supertest';
import { E2eContext, authRequest, setupE2e } from './setup-e2e';

/** Rota interna da Lambda de autenticação por CPF (docs/contratos.md, seção 7). */
describe('POST /internal/clientes/busca (e2e)', () => {
  let ctx: E2eContext;
  let clienteId: string;
  const token = { 'x-internal-token': 'e2e-token-interno' };

  function buscar(cpf: string, headers: Record<string, string> = token) {
    return request(ctx.app.getHttpServer())
      .post('/internal/clientes/busca')
      .set(headers)
      .send({ cpf });
  }

  beforeAll(async () => {
    ctx = await setupE2e();
    clienteId = (
      await authRequest(ctx, 'post', '/cliente').send({
        nome: 'E2E Interno',
        telefone: '(11)977776666',
        email: 'e2e-interno@teste.com',
        cpfCnpj: '730.194.628-78',
        tipoPessoa: 'FISICA',
      })
    ).body.id;
  });

  afterAll(async () => {
    await authRequest(ctx, 'delete', `/cliente/delete/${clienteId}`);
    await ctx.app.close();
  });

  it('com o token, devolve id, nome e status do cliente (CPF com ou sem pontuação)', async () => {
    const esperado = { id: clienteId, nome: 'E2E Interno', status: 'ATIVO' };

    expect((await buscar('730.194.628-78').expect(200)).body).toEqual(esperado);
    expect((await buscar('73019462878').expect(200)).body).toEqual(esperado);
  });

  it('cliente inexistente: 404', async () => {
    await buscar('90241357616').expect(404);
  });

  it('sem o token ou com token errado: 401', async () => {
    await buscar('73019462878', {}).expect(401);
    await buscar('73019462878', { 'x-internal-token': 'errado' }).expect(401);
  });

  it('o JWT de funcionário não substitui o token interno', async () => {
    await authRequest(ctx, 'post', '/internal/clientes/busca')
      .send({ cpf: '73019462878' })
      .expect(401);
  });
});
