import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Clientes (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let clienteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@oficina.com', senha: 'senha123' });

    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (clienteId) {
      await request(app.getHttpServer())
        .delete(`/cliente/delete/${clienteId}`)
        .set('Authorization', `Bearer ${token}`);
    }
    await app.close();
  });

  it('POST /cliente — cria cliente', async () => {
    const res = await request(app.getHttpServer())
      .post('/cliente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E Cliente Teste',
        telefone: '(11)999999999',
        email: 'e2e-cliente@teste.com',
        cpfCnpj: '111.222.333-44',
        tipoPessoa: 'FISICA',
      })
      .expect(201);

    clienteId = res.body.id;
    expect(res.body.nome).toBe('E2E Cliente Teste');
    expect(res.body.cpfCnpj).toBeDefined();
  });

  it('GET /cliente — lista clientes', async () => {
    const res = await request(app.getHttpServer())
      .get('/cliente')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.client).toBeInstanceOf(Array);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /cliente/:id — busca por ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/cliente/${clienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(clienteId);
  });

  it('PUT /cliente/update/:id — atualiza cliente', async () => {
    const res = await request(app.getHttpServer())
      .put(`/cliente/update/${clienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E Cliente Atualizado',
        telefone: '(11)888888888',
        email: 'e2e-cliente@teste.com',
        cpfCnpj: '111.222.333-44',
        tipoPessoa: 'FISICA',
      })
      .expect(200);

    expect(res.body.nome).toBe('E2E Cliente Atualizado');
  });

  it('POST /cliente — rejeita CPF duplicado', async () => {
    const res = await request(app.getHttpServer())
      .post('/cliente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Outro',
        telefone: '(11)999999999',
        email: 'outro-e2e@teste.com',
        cpfCnpj: '111.222.333-44',
        tipoPessoa: 'FISICA',
      });

    expect([400, 409]).toContain(res.status);
  });

  it('GET /cliente/:id — 404 para ID inexistente', async () => {
    await request(app.getHttpServer())
      .get('/cliente/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('GET /cliente — 401 sem token', async () => {
    await request(app.getHttpServer())
      .get('/cliente')
      .expect(401);
  });

  it('DELETE /cliente/delete/:id — deleta cliente', async () => {
    await request(app.getHttpServer())
      .delete(`/cliente/delete/${clienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    clienteId = undefined;
  });
});
