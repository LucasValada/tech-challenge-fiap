import { cpf } from 'cpf-cnpj-validator';
import request from 'supertest';
import { WEBHOOK_TOKEN_ENV, WEBHOOK_TOKEN_HEADER } from '../src/common/guards';
import { E2eContext, setupE2e, publicRequest } from './setup-e2e';
import {
  adicionarServicoNaOS,
  criarClienteFixture,
  criarOS,
  criarServicoFixture,
  criarVeiculoFixture,
  limparRecursos,
  transicionarStatus,
} from './helpers/os-fixtures';

const TOKEN = 'test-webhook-token-1234567890';
const URL = '/webhooks/orcamento';

interface WebhookPayload {
  codigoOS: string;
  aprovado: boolean;
}

describe('POST /webhooks/orcamento (e2e)', () => {
  let ctx: E2eContext;
  let clienteId: string;
  const veiculoIds: string[] = [];
  const servicoIds: string[] = [];
  const osIds: string[] = [];
  const cpfCnpj = cpf.generate();
  const placas = ['WHK1A01', 'WHK1A02', 'WHK1A03'];

  const postWebhook = (payload: WebhookPayload, token: string | null = TOKEN) => {
    const req = request(ctx.app.getHttpServer()).post(URL);
    if (token !== null) {
      req.set(WEBHOOK_TOKEN_HEADER, token);
    }
    return req.send(payload);
  };

  const criarOSAguardandoAprovacao = async (placa: string): Promise<string> => {
    veiculoIds.push(await criarVeiculoFixture(ctx, clienteId, placa));

    const { id: osId, codigo } = await criarOS(ctx, cpfCnpj, placa);
    osIds.push(osId);

    const servicoId = await criarServicoFixture(ctx, 'WHK Servico', {
      precoBase: 120,
    });
    servicoIds.push(servicoId);
    await adicionarServicoNaOS(ctx, osId, servicoId, 1);

    await transicionarStatus(ctx, osId, 'EM_DIAGNOSTICO');
    await transicionarStatus(ctx, osId, 'AGUARDANDO_APROVACAO');

    return codigo;
  };

  const consultarStatus = async (
    codigo: string,
    placa: string,
  ): Promise<string> => {
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

    clienteId = await criarClienteFixture(ctx, {
      nome: 'E2E Webhook Cliente',
      telefone: '(11)977776666',
      email: 'e2e-webhook@teste.com',
      cpfCnpj,
      tipoPessoa: 'FISICA',
    });
  });

  afterAll(async () => {
    await limparRecursos(ctx, { osIds, servicoIds, veiculoIds, clienteId });
    await ctx.app.close();
  });

  it('401 quando header X-Webhook-Token está ausente', async () => {
    await postWebhook({ codigoOS: 'OS-2026-000001', aprovado: true }, null)
      .expect(401);
  });

  it('401 quando token está inválido', async () => {
    await postWebhook(
      { codigoOS: 'OS-2026-000001', aprovado: true },
      'token-errado-com-mesmo-tamanho-xxx',
    ).expect(401);
  });

  it('aprovação transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO', async () => {
    const codigo = await criarOSAguardandoAprovacao(placas[0]);

    const res = await postWebhook({ codigoOS: codigo, aprovado: true }).expect(
      200,
    );

    expect(res.body).toEqual({ codigo, status: 'EM_EXECUCAO' });
    expect(await consultarStatus(codigo, placas[0])).toBe('EM_EXECUCAO');
  });

  it('recusa faz rollback AGUARDANDO_APROVACAO → EM_DIAGNOSTICO', async () => {
    const codigo = await criarOSAguardandoAprovacao(placas[1]);

    const res = await postWebhook({ codigoOS: codigo, aprovado: false }).expect(
      200,
    );

    expect(res.body).toEqual({ codigo, status: 'EM_DIAGNOSTICO' });
    expect(await consultarStatus(codigo, placas[1])).toBe('EM_DIAGNOSTICO');
  });

  it('404 quando código não existe', async () => {
    await postWebhook({ codigoOS: 'OS-2026-999999', aprovado: true }).expect(
      404,
    );
  });

  it('409 quando OS não está em AGUARDANDO_APROVACAO', async () => {
    const codigo = await criarOSAguardandoAprovacao(placas[2]);

    await postWebhook({ codigoOS: codigo, aprovado: true }).expect(200);
    await postWebhook({ codigoOS: codigo, aprovado: true }).expect(409);
  });

  it('400 quando codigoOS está em formato inválido', async () => {
    await postWebhook({ codigoOS: 'formato-errado', aprovado: true }).expect(
      400,
    );
  });
});
