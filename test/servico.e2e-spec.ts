import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Serviços (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let servicoId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@oficina.com', senha: 'senha123' });
    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (servicoId) {
      await request(app.getHttpServer())
        .delete(`/servicos/${servicoId}`)
        .set('Authorization', `Bearer ${token}`);
    }
    await app.close();
  });

  it('POST /servicos — cria serviço', async () => {
    const res = await request(app.getHttpServer())
      .post('/servicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E Alinhamento',
        descricao: 'Alinhamento de direção completo',
        precoBase: 120.0,
        tempoEstimadoMin: 45,
      })
      .expect(201);

    servicoId = res.body.id;
    expect(res.body.nome).toBe('E2E Alinhamento');
    expect(Number(res.body.precoBase)).toBe(120);
  });

  it('GET /servicos — lista serviços', async () => {
    const res = await request(app.getHttpServer())
      .get('/servicos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /servicos/:id — busca por ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/servicos/${servicoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(servicoId);
  });

  it('PUT /servicos/:id — atualiza serviço', async () => {
    const res = await request(app.getHttpServer())
      .put(`/servicos/${servicoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'E2E Alinhamento Atualizado', precoBase: 130.0 })
      .expect(200);

    expect(res.body.nome).toBe('E2E Alinhamento Atualizado');
  });

  it('GET /servicos/:id — 404 para ID inexistente', async () => {
    await request(app.getHttpServer())
      .get('/servicos/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('GET /servicos — 401 sem token', async () => {
    await request(app.getHttpServer()).get('/servicos').expect(401);
  });

  it('DELETE /servicos/:id — deleta serviço', async () => {
    await request(app.getHttpServer())
      .delete(`/servicos/${servicoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    servicoId = undefined;
  });
});
