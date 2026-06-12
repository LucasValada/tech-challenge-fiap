import { E2eContext, setupE2e, authRequest } from './setup-e2e';

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
  const itemEstoqueIds: string[] = [];
  const osIds: string[] = [];
  const cpfCnpj = '111.444.777-35';

  const placas = ['LST1A01', 'LST1A02', 'LST1A03', 'LST1A04', 'LST1A05'];

  const criarOS = async (placa: string): Promise<string> => {
    const res = await authRequest(ctx, 'post', '/ordens-servico')
      .send({ cpfCnpj, placa })
      .expect(201);
    return res.body.id;
  };

  const transicionar = async (osId: string, status: string): Promise<void> => {
    await authRequest(ctx, 'post', `/ordens-servico/${osId}/transicao-status`)
      .send({ status })
      .expect(200);
  };

  const adicionarLinhasMinimas = async (osId: string): Promise<void> => {
    const servicoRes = await authRequest(ctx, 'post', '/servicos').send({
      nome: `LST Servico ${Date.now()}-${Math.random()}`,
      precoBase: 100,
      tempoEstimadoMin: 30,
    });
    servicoIds.push(servicoRes.body.id);

    await authRequest(ctx, 'post', `/ordens-servico/${osId}/servicos`)
      .send({ servicoId: servicoRes.body.id, quantidade: 1 })
      .expect(201);
  };

  beforeAll(async () => {
    ctx = await setupE2e();

    const clienteRes = await authRequest(ctx, 'post', '/cliente').send({
      nome: 'E2E Listagem Cliente',
      telefone: '(11)988887777',
      email: 'e2e-listagem@teste.com',
      cpfCnpj,
      tipoPessoa: 'FISICA',
    });
    clienteId = clienteRes.body.id;

    for (const placa of placas) {
      const veiculoRes = await authRequest(ctx, 'post', '/veiculos').send({
        placa,
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2020,
        clienteId,
      });
      veiculoIds.push(veiculoRes.body.id);
    }
  });

  afterAll(async () => {
    for (const osId of osIds) {
      await authRequest(ctx, 'delete', `/ordens-servico/${osId}`);
    }
    for (const itemId of itemEstoqueIds) {
      await authRequest(ctx, 'delete', `/itens-estoque/${itemId}`);
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

  it('ordena por prioridade de status e exclui FINALIZADA/ENTREGUE', async () => {
    const osRecebidaAntiga = await criarOS(placas[0]);
    osIds.push(osRecebidaAntiga);

    const osRecebidaNova = await criarOS(placas[1]);
    osIds.push(osRecebidaNova);

    const osDiagnostico = await criarOS(placas[2]);
    osIds.push(osDiagnostico);
    await transicionar(osDiagnostico, 'EM_DIAGNOSTICO');

    const osAguardando = await criarOS(placas[3]);
    osIds.push(osAguardando);
    await transicionar(osAguardando, 'EM_DIAGNOSTICO');
    await transicionar(osAguardando, 'AGUARDANDO_APROVACAO');

    const osFinalizada = await criarOS(placas[4]);
    osIds.push(osFinalizada);
    await adicionarLinhasMinimas(osFinalizada);
    await transicionar(osFinalizada, 'EM_DIAGNOSTICO');
    await transicionar(osFinalizada, 'AGUARDANDO_APROVACAO');
    await transicionar(osFinalizada, 'EM_EXECUCAO');
    await transicionar(osFinalizada, 'FINALIZADA');

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
