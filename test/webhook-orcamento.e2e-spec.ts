import { cpf } from 'cpf-cnpj-validator';
import { WEBHOOK_TOKEN_ENV, WEBHOOK_TOKEN_HEADER } from '../src/common/guards';
import { E2eContext, setupE2e, authRequest, publicRequest } from './setup-e2e';
import request from 'supertest';

const TOKEN = 'test-webhook-token-1234567890';
const URL = '/webhooks/orcamento';

describe('POST /webhooks/orcamento (e2e)', () => {
  let ctx: E2eContext;
  let clienteId: string;
  const veiculoIds: string[] = [];
  const servicoIds: string[] = [];
  const osIds: string[] = [];
  const cpfCnpj = cpf.generate();
  const placas = ['WHK1A01', 'WHK1A02', 'WHK1A03'];

  const criarOSAguardandoAprovacao = async (
    placa: string,
  ): Promise<string> => {
    const veiculoRes = await authRequest(ctx, 'post', '/veiculos').send({
      placa,
      marca: 'Fiat',
      modelo: 'Uno',
      ano: 2020,
      clienteId,
    });
    veiculoIds.push(veiculoRes.body.id);

    const osRes = await authRequest(ctx, 'post', '/ordens-servico')
      .send({ cpfCnpj, placa })
      .expect(201);
    const osId: string = osRes.body.id;
    const codigo: string = osRes.body.codigo;
    osIds.push(osId);

    const servicoRes = await authRequest(ctx, 'post', '/servicos').send({
      nome: `WHK Servico ${Date.now()}-${Math.random()}`,
      precoBase: 120,
      tempoEstimadoMin: 30,
    });
    servicoIds.push(servicoRes.body.id);

    await authRequest(ctx, 'post', `/ordens-servico/${osId}/servicos`)
      .send({ servicoId: servicoRes.body.id, quantidade: 1 })
      .expect(201);

    await authRequest(ctx, 'post', `/ordens-servico/${osId}/transicao-status`)
      .send({ status: 'EM_DIAGNOSTICO' })
      .expect(200);

    await authRequest(ctx, 'post', `/ordens-servico/${osId}/transicao-status`)
      .send({ status: 'AGUARDANDO_APROVACAO' })
      .expect(200);

    return codigo;
  };

  const consultarStatus = async (codigo: string, placa: string) => {
    const res = await publicRequest(
      ctx,
      'get',
      `/public/ordens-servico/${codigo}?placa=${placa}`,
    ).expect(200);
    return res.body.status as string;
  };

  beforeAll(async () => {
    process.env[WEBHOOK_TOKEN_ENV] = TOKEN;
    ctx = await setupE2e();

    const clienteRes = await authRequest(ctx, 'post', '/cliente').send({
      nome: 'E2E Webhook Cliente',
      telefone: '(11)977776666',
      email: 'e2e-webhook@teste.com',
      cpfCnpj,
      tipoPessoa: 'FISICA',
    });
    clienteId = clienteRes.body.id;
  });

  afterAll(async () => {
    for (const osId of osIds) {
      await authRequest(ctx, 'delete', `/ordens-servico/${osId}`);
    }
    for (const servicoId of servicoIds) {
      await authRequest(ctx, 'delete', `/servicos/${servicoId}`);
    }
    for (const veiculoId of veiculoIds) {
      await authRequest(ctx, 'delete', `/veiculos/${veiculoId}`);
    }
    if (clienteId) {
      await authRequest(ctx, 'delete', `/cliente/delete/${clienteId}`);
    }
    await ctx.app.close();
  });

  it('401 quando header X-Webhook-Token está ausente', async () => {
    await request(ctx.app.getHttpServer())
      .post(URL)
      .send({ codigoOS: 'OS-2026-000001', aprovado: true })
      .expect(401);
  });

  it('401 quando token está inválido', async () => {
    await request(ctx.app.getHttpServer())
      .post(URL)
      .set(WEBHOOK_TOKEN_HEADER, 'token-errado-com-mesmo-tamanho-xxx')
      .send({ codigoOS: 'OS-2026-000001', aprovado: true })
      .expect(401);
  });

  it('aprovação transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO', async () => {
    const codigo = await criarOSAguardandoAprovacao(placas[0]);

    const res = await request(ctx.app.getHttpServer())
      .post(URL)
      .set(WEBHOOK_TOKEN_HEADER, TOKEN)
      .send({ codigoOS: codigo, aprovado: true })
      .expect(200);

    expect(res.body).toEqual({ codigo, status: 'EM_EXECUCAO' });
    expect(await consultarStatus(codigo, placas[0])).toBe('EM_EXECUCAO');
  });

  it('recusa faz rollback AGUARDANDO_APROVACAO → EM_DIAGNOSTICO', async () => {
    const codigo = await criarOSAguardandoAprovacao(placas[1]);

    const res = await request(ctx.app.getHttpServer())
      .post(URL)
      .set(WEBHOOK_TOKEN_HEADER, TOKEN)
      .send({ codigoOS: codigo, aprovado: false })
      .expect(200);

    expect(res.body).toEqual({ codigo, status: 'EM_DIAGNOSTICO' });
    expect(await consultarStatus(codigo, placas[1])).toBe('EM_DIAGNOSTICO');
  });

  it('404 quando código não existe', async () => {
    await request(ctx.app.getHttpServer())
      .post(URL)
      .set(WEBHOOK_TOKEN_HEADER, TOKEN)
      .send({ codigoOS: 'OS-2026-999999', aprovado: true })
      .expect(404);
  });

  it('409 quando OS não está em AGUARDANDO_APROVACAO', async () => {
    const codigo = await criarOSAguardandoAprovacao(placas[2]);

    await request(ctx.app.getHttpServer())
      .post(URL)
      .set(WEBHOOK_TOKEN_HEADER, TOKEN)
      .send({ codigoOS: codigo, aprovado: true })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(URL)
      .set(WEBHOOK_TOKEN_HEADER, TOKEN)
      .send({ codigoOS: codigo, aprovado: true })
      .expect(409);
  });

  it('400 quando codigoOS está em formato inválido', async () => {
    await request(ctx.app.getHttpServer())
      .post(URL)
      .set(WEBHOOK_TOKEN_HEADER, TOKEN)
      .send({ codigoOS: 'formato-errado', aprovado: true })
      .expect(400);
  });
});
