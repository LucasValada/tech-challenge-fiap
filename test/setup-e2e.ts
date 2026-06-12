import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

export const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';

export interface E2eContext {
  app: INestApplication<App>;
  token: string;
}

export async function setupE2e(): Promise<E2eContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'admin@oficina.com', senha: 'senha123' });

  return { app, token: loginRes.body.accessToken };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function authRequest(
  ctx: E2eContext,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
) {
  return request(ctx.app.getHttpServer())
    [method](url)
    .set(authHeader(ctx.token));
}

export function publicRequest(
  ctx: E2eContext,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
) {
  return request(ctx.app.getHttpServer())[method](url);
}

export function expectUnauthorized(ctx: E2eContext, url: string) {
  return request(ctx.app.getHttpServer()).get(url).expect(401);
}

export function expectNotFound(ctx: E2eContext, url: string) {
  return authRequest(ctx, 'get', `${url}/${NON_EXISTENT_ID}`).expect(404);
}
