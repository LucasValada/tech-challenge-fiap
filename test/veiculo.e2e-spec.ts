import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Veículos (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let clienteId: string;
  let veiculoId: string;

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

    // Cliente necessário para vincular veículo
    const clienteRes = await request(app.getHttpServer())
      .post('/cliente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E Veiculo Cliente',
        telefone: '(11)999999999',
        email: 'e2e-veiculo@teste.com',
        cpfCnpj: '444.555.666-77',
        tipoPessoa: 'FISICA',
      });
    clienteId = clienteRes.body.id;
  });

  afterAll(async () => {
    const auth = { Authorization: `Bearer ${token}` };
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

  it('POST /veiculos — cria veículo', async () => {
    const res = await request(app.getHttpServer())
      .post('/veiculos')
      .set('Authorization', `Bearer ${token}`)
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
    const res = await request(app.getHttpServer())
      .get('/veiculos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /veiculos/:id — busca por ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/veiculos/${veiculoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(veiculoId);
  });

  it('PUT /veiculos/:id — atualiza veículo', async () => {
    const res = await request(app.getHttpServer())
      .put(`/veiculos/${veiculoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ marca: 'Honda', modelo: 'Civic Touring', ano: 2023 })
      .expect(200);

    expect(res.body.modelo).toBe('Civic Touring');
  });

  it('GET /veiculos/:id — 404 para ID inexistente', async () => {
    await request(app.getHttpServer())
      .get('/veiculos/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('GET /veiculos — 401 sem token', async () => {
    await request(app.getHttpServer())
      .get('/veiculos')
      .expect(401);
  });

  it('DELETE /veiculos/:id — deleta veículo', async () => {
    await request(app.getHttpServer())
      .delete(`/veiculos/${veiculoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    veiculoId = undefined;
  });
});
