import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Ordem de Serviço — fluxo completo (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let clienteId: string;
  let veiculoId: string;
  let servicoId: string;
  let itemEstoqueId: string;
  let osId: string;
  let osCodigo: string;
  const skuUnico = `E2E-OS-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@oficina.com', senha: 'senha123' });
    token = loginRes.body.accessToken;

    // Criar cliente de teste
    const clienteRes = await request(app.getHttpServer())
      .post('/cliente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E OS Cliente',
        telefone: '(11)999999999',
        email: 'e2e-os@teste.com',
        cpfCnpj: '999.888.777-66',
        tipoPessoa: 'FISICA',
      });
    if (clienteRes.status !== 201) {
      throw new Error(
        `Setup cliente falhou: ${clienteRes.status} ${JSON.stringify(clienteRes.body)}`,
      );
    }
    clienteId = clienteRes.body.id;

    // Criar veículo vinculado ao cliente
    const veiculoRes = await request(app.getHttpServer())
      .post('/veiculos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        placa: 'TST1A99',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2020,
        clienteId,
      });
    veiculoId = veiculoRes.body.id;

    // Criar serviço
    const servicoRes = await request(app.getHttpServer())
      .post('/servicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E Troca de óleo',
        precoBase: 150.0,
        tempoEstimadoMin: 30,
      });
    servicoId = servicoRes.body.id;

    // Criar item de estoque
    const itemRes = await request(app.getHttpServer())
      .post('/itens-estoque')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E Pastilha de freio',
        tipo: 'PECA',
        sku: skuUnico,
        precoUnitario: 80.0,
        quantidadeEstoque: 20,
        estoqueMinimo: 5,
      });
    itemEstoqueId = itemRes.body.id;
  });

  afterAll(async () => {
    const auth = { Authorization: `Bearer ${token}` };
    // Limpar dados de teste (OS primeiro por FK)
    if (osId) {
      await request(app.getHttpServer())
        .delete(`/ordens-servico/${osId}`)
        .set(auth);
    }
    if (itemEstoqueId) {
      await request(app.getHttpServer())
        .delete(`/itens-estoque/${itemEstoqueId}`)
        .set(auth);
    }
    if (servicoId) {
      await request(app.getHttpServer())
        .delete(`/servicos/${servicoId}`)
        .set(auth);
    }
    if (veiculoId) {
      await request(app.getHttpServer())
        .delete(`/veiculos/${veiculoId}`)
        .set(auth);
    }
    if (clienteId) {
      await request(app.getHttpServer())
        .delete(`/cliente/delete/${clienteId}`)
        .set(auth);
    }
    await app.close();
  });

  it('POST /ordens-servico — cria OS por CPF + placa', async () => {
    const res = await request(app.getHttpServer())
      .post('/ordens-servico')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cpfCnpj: '999.888.777-66',
        placa: 'TST1A99',
        observacoes: 'Teste e2e',
      });

    expect(res.status).toBe(201);

    osId = res.body.id;
    osCodigo = res.body.codigo;
    expect(res.body.status).toBe('RECEBIDA');
    expect(res.body.codigo).toMatch(/^OS-/);
  });

  it('GET /ordens-servico — lista OS', async () => {
    const res = await request(app.getHttpServer())
      .get('/ordens-servico')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.ordens).toBeInstanceOf(Array);
  });

  it('GET /ordens-servico/:id — detalhes da OS', async () => {
    const res = await request(app.getHttpServer())
      .get(`/ordens-servico/${osId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(osId);
    expect(res.body.cliente).toBeDefined();
    expect(res.body.veiculo).toBeDefined();
  });

  it('POST /ordens-servico/:id/servicos — adiciona serviço à OS', async () => {
    const res = await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/servicos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ servicoId, quantidade: 1 })
      .expect(201);

    expect(res.body.servicoId).toBe(servicoId);
  });

  it('POST /ordens-servico/:id/itens-estoque — adiciona item e baixa estoque', async () => {
    const res = await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/itens-estoque`)
      .set('Authorization', `Bearer ${token}`)
      .send({ itemEstoqueId, quantidade: 3 })
      .expect(201);

    expect(res.body.itemEstoqueId).toBe(itemEstoqueId);
    expect(res.body.quantidade).toBe(3);

    // Verificar que estoque foi reduzido de 20 para 17
    const itemRes = await request(app.getHttpServer())
      .get(`/itens-estoque/${itemEstoqueId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(itemRes.body.quantidadeEstoque).toBe(17);
  });

  it('DELETE /ordens-servico/:id/itens-estoque/:linhaId — remove item e restitui estoque', async () => {
    // Buscar detalhes da OS para pegar o linhaId do item
    const detalhes = await request(app.getHttpServer())
      .get(`/ordens-servico/${osId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const linhaItemId = detalhes.body.itens[0].id;

    await request(app.getHttpServer())
      .delete(`/ordens-servico/${osId}/itens-estoque/${linhaItemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    // Verificar que estoque foi restituído de 17 para 20
    const itemRes = await request(app.getHttpServer())
      .get(`/itens-estoque/${itemEstoqueId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(itemRes.body.quantidadeEstoque).toBe(20);
  });

  it('POST /ordens-servico/:id/transicao-status — RECEBIDA → EM_DIAGNOSTICO', async () => {
    const res = await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/transicao-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'EM_DIAGNOSTICO', observacao: 'Iniciando diagnóstico' })
      .expect(200);

    expect(res.body.status).toBe('EM_DIAGNOSTICO');
  });

  it('POST /ordens-servico/:id/enviar-orcamento — EM_DIAGNOSTICO → AGUARDANDO_APROVACAO', async () => {
    const res = await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/enviar-orcamento`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.status).toBe('AGUARDANDO_APROVACAO');
    expect(res.body.valorTotal).toBeGreaterThan(0);
  });

  it('GET /public/ordens-servico/:codigo — consulta pública da OS', async () => {
    const res = await request(app.getHttpServer())
      .get(`/public/ordens-servico/${osCodigo}?placa=TST1A99`)
      .expect(200);

    expect(res.body.status).toBe('AGUARDANDO_APROVACAO');
    expect(res.body.codigo).toBe(osCodigo);
  });

  it('POST /public/ordens-servico/:codigo/aprovar — cliente aprova orçamento', async () => {
    const res = await request(app.getHttpServer())
      .post(`/public/ordens-servico/${osCodigo}/aprovar`)
      .send({ placa: 'TST1A99' })
      .expect(200);

    expect(res.body.status).toBe('EM_EXECUCAO');
  });

  it('POST transicao-status — EM_EXECUCAO → FINALIZADA', async () => {
    const res = await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/transicao-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'FINALIZADA' })
      .expect(200);

    expect(res.body.status).toBe('FINALIZADA');
  });

  it('POST transicao-status — FINALIZADA → ENTREGUE', async () => {
    const res = await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/transicao-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ENTREGUE' })
      .expect(200);

    expect(res.body.status).toBe('ENTREGUE');
  });

  it('POST transicao-status — rejeita transição inválida em status terminal', async () => {
    await request(app.getHttpServer())
      .post(`/ordens-servico/${osId}/transicao-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'RECEBIDA' })
      .expect(409);
  });
});
