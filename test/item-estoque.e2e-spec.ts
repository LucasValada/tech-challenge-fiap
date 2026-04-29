import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Itens de Estoque (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let itemId: string;
  const skuUnico = `E2E-FLT-${Date.now()}`;

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
    if (itemId) {
      await request(app.getHttpServer())
        .delete(`/itens-estoque/${itemId}`)
        .set('Authorization', `Bearer ${token}`);
    }
    await app.close();
  });

  it('POST /itens-estoque — cria item de estoque', async () => {
    const res = await request(app.getHttpServer())
      .post('/itens-estoque')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'E2E Filtro de ar',
        tipo: 'PECA',
        sku: skuUnico,
        descricao: 'Filtro de ar para teste e2e',
        precoUnitario: 35.9,
        quantidadeEstoque: 50,
        estoqueMinimo: 5,
      })
      .expect(201);

    itemId = res.body.id;
    expect(res.body.nome).toBe('E2E Filtro de ar');
    expect(res.body.tipo).toBe('PECA');
    expect(res.body.quantidadeEstoque).toBe(50);
  });

  it('GET /itens-estoque — lista itens', async () => {
    const res = await request(app.getHttpServer())
      .get('/itens-estoque')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /itens-estoque?tipo=PECA — filtra por tipo', async () => {
    const res = await request(app.getHttpServer())
      .get('/itens-estoque?tipo=PECA')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    for (const item of res.body) {
      expect(item.tipo).toBe('PECA');
    }
  });

  it('GET /itens-estoque/baixo-estoque — lista baixo estoque', async () => {
    await request(app.getHttpServer())
      .get('/itens-estoque/baixo-estoque')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('GET /itens-estoque/:id — busca por ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/itens-estoque/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(itemId);
  });

  it('PUT /itens-estoque/:id — atualiza item', async () => {
    const res = await request(app.getHttpServer())
      .put(`/itens-estoque/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'E2E Filtro de ar Atualizado', precoUnitario: 40.0 })
      .expect(200);

    expect(res.body.nome).toBe('E2E Filtro de ar Atualizado');
  });

  it('GET /itens-estoque/:id — 404 para ID inexistente', async () => {
    await request(app.getHttpServer())
      .get('/itens-estoque/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('GET /itens-estoque — 401 sem token', async () => {
    await request(app.getHttpServer())
      .get('/itens-estoque')
      .expect(401);
  });

  it('DELETE /itens-estoque/:id — deleta item', async () => {
    await request(app.getHttpServer())
      .delete(`/itens-estoque/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    itemId = undefined;
  });
});
