import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
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

/**
 * Emite um token de CLIENTE (mesmo shape do JWT gerado pela Lambda de auth por
 * CPF: `tipo:'cliente'`, `sub` = clienteId), assinado com o mesmo JWT_SECRET da
 * aplicação. Permite exercitar as rotas protegidas por CPF nos testes e2e.
 */
export function clienteToken(
  ctx: E2eContext,
  cliente: { id: string; cpf?: string; nome?: string },
): string {
  const jwt = ctx.app.get(JwtService, { strict: false });
  return jwt.sign(
    { tipo: 'cliente', cpf: cliente.cpf, nome: cliente.nome },
    { subject: cliente.id },
  );
}

export function clienteRequest(
  ctx: E2eContext,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  token: string,
) {
  return request(ctx.app.getHttpServer())[method](url).set(authHeader(token));
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
