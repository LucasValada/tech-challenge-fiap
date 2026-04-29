import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Relatório Tempo Médio (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

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
    await app.close();
  });

  it('GET /ordens-servico/relatorios/tempo-medio-servicos — retorna relatório sem filtros', async () => {
    const res = await request(app.getHttpServer())
      .get('/ordens-servico/relatorios/tempo-medio-servicos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('periodo');
    expect(res.body).toHaveProperty('totalOrdensConsideradas');
    expect(res.body).toHaveProperty('servicos');
    expect(res.body.periodo.dataInicio).toBeNull();
    expect(res.body.periodo.dataFim).toBeNull();
    expect(res.body.servicos).toBeInstanceOf(Array);
  });

  it('GET /ordens-servico/relatorios/tempo-medio-servicos — filtra por período', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/ordens-servico/relatorios/tempo-medio-servicos?dataInicio=2026-01-01&dataFim=2026-12-31',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.periodo.dataInicio).toBe('2026-01-01');
    expect(res.body.periodo.dataFim).toBe('2026-12-31');
  });

  it('GET /ordens-servico/relatorios/tempo-medio-servicos — 400 quando dataInicio > dataFim', async () => {
    await request(app.getHttpServer())
      .get(
        '/ordens-servico/relatorios/tempo-medio-servicos?dataInicio=2026-12-31&dataFim=2026-01-01',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /ordens-servico/relatorios/tempo-medio-servicos — 401 sem token', async () => {
    await request(app.getHttpServer())
      .get('/ordens-servico/relatorios/tempo-medio-servicos')
      .expect(401);
  });
});
