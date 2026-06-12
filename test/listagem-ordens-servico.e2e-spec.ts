import { E2eContext, setupE2e, authRequest } from './setup-e2e';
import {
  adicionarServicoNaOS,
  criarClienteFixture,
  criarOS,
  criarServicoFixture,
  criarVeiculoFixture,
  limparRecursos,
  transicionarStatus,
} from './helpers/os-fixtures';

interface OrdemListada {
  id: string;
  status: string;
  createdAt: string;
}

describe('GET /ordens-servico — ordenação e filtro (Fase 2)', () => {
  let ctx: E2eContext;
  let clienteId: string;
  const veiculoIds: string[] = [];
  const servicoIds: string[] = [];
  const osIds: string[] = [];
  const cpfCnpj = '111.444.777-35';
  const placas = ['LST1A01', 'LST1A02', 'LST1A03', 'LST1A04', 'LST1A05'];

  beforeAll(async () => {
    ctx = await setupE2e();

    clienteId = await criarClienteFixture(ctx, {
      nome: 'E2E Listagem Cliente',
      telefone: '(11)988887777',
      email: 'e2e-listagem@teste.com',
      cpfCnpj,
      tipoPessoa: 'FISICA',
    });

    for (const placa of placas) {
      veiculoIds.push(await criarVeiculoFixture(ctx, clienteId, placa));
    }
  });

  afterAll(async () => {
    await limparRecursos(ctx, { osIds, servicoIds, veiculoIds, clienteId });
    await ctx.app.close();
  });

  it('ordena por prioridade de status e exclui FINALIZADA/ENTREGUE', async () => {
    const osRecebidaAntiga = (await criarOS(ctx, cpfCnpj, placas[0])).id;
    osIds.push(osRecebidaAntiga);

    const osRecebidaNova = (await criarOS(ctx, cpfCnpj, placas[1])).id;
    osIds.push(osRecebidaNova);

    const osDiagnostico = (await criarOS(ctx, cpfCnpj, placas[2])).id;
    osIds.push(osDiagnostico);
    await transicionarStatus(ctx, osDiagnostico, 'EM_DIAGNOSTICO');

    const osAguardando = (await criarOS(ctx, cpfCnpj, placas[3])).id;
    osIds.push(osAguardando);
    await transicionarStatus(ctx, osAguardando, 'EM_DIAGNOSTICO');
    await transicionarStatus(ctx, osAguardando, 'AGUARDANDO_APROVACAO');

    const osFinalizada = (await criarOS(ctx, cpfCnpj, placas[4])).id;
    osIds.push(osFinalizada);
    const servicoId = await criarServicoFixture(ctx, 'LST Servico');
    servicoIds.push(servicoId);
    await adicionarServicoNaOS(ctx, osFinalizada, servicoId, 1);
    for (const status of [
      'EM_DIAGNOSTICO',
      'AGUARDANDO_APROVACAO',
      'EM_EXECUCAO',
      'FINALIZADA',
    ]) {
      await transicionarStatus(ctx, osFinalizada, status);
    }

    const res = await authRequest(ctx, 'get', '/ordens-servico').expect(200);
    const ordens: OrdemListada[] = res.body.ordens;

    const statusRetornados = ordens.map((o) => o.status);
    expect(statusRetornados).not.toContain('FINALIZADA');
    expect(statusRetornados).not.toContain('ENTREGUE');

    const idsDoTeste = [
      osRecebidaAntiga,
      osRecebidaNova,
      osDiagnostico,
      osAguardando,
    ];
    const ordensDoTeste = ordens.filter((o) => idsDoTeste.includes(o.id));
    expect(ordensDoTeste).toHaveLength(4);

    const idsNaOrdemEsperada = [
      osAguardando,
      osDiagnostico,
      osRecebidaAntiga,
      osRecebidaNova,
    ];
    const posicoes = idsNaOrdemEsperada.map((id) =>
      ordens.findIndex((o) => o.id === id),
    );
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });
});
