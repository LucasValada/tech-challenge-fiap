import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  criarEnvelope,
  type Envelope,
} from '../src/common/mensageria/envelope';
import {
  PUBLICADOR_COMANDOS,
  type PublicadorComandos,
} from '../src/modules/ordem-servico/application/saga/mensagens-saga';
import { ProcessarRespostaSagaUseCase } from '../src/modules/ordem-servico/application/use-case/processar-resposta-saga.use-case';
import { RespostasSagaConsumer } from '../src/modules/ordem-servico/interface/consumer/respostas-saga.consumer';

export const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * No lugar do SQS: guarda os comandos que o OS publica, para os testes
 * conferirem o que foi pedido ao Billing e ao Execution.
 */
export class ComandosPublicados implements PublicadorComandos {
  readonly envelopes: Envelope<unknown>[] = [];

  publicar(envelope: Envelope<unknown>): Promise<void> {
    this.envelopes.push(envelope);
    return Promise.resolve();
  }

  /** Os comandos publicados para uma OS, na ordem. */
  da(osId: string): Envelope<unknown>[] {
    return this.envelopes.filter((e) => e.osId === osId);
  }

  tiposDa(osId: string): string[] {
    return this.da(osId).map((e) => e.tipo);
  }
}

export interface E2eContext {
  app: INestApplication<App>;
  token: string;
  comandos: ComandosPublicados;
}

export async function setupE2e(): Promise<E2eContext> {
  const comandos = new ComandosPublicados();
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PUBLICADOR_COMANDOS)
    .useValue(comandos)
    // Sem fila no e2e: as respostas da Saga são entregues direto ao
    // orquestrador por `responderSaga`.
    .overrideProvider(RespostasSagaConsumer)
    .useValue({
      onApplicationBootstrap: () => undefined,
      onApplicationShutdown: () => undefined,
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'admin@oficina.com', senha: 'senha123' });

  return { app, token: loginRes.body.accessToken, comandos };
}

/**
 * Simula uma resposta do Billing ou do Execution chegando pela fila
 * oficina-os-saga-replies: entrega o envelope ao orquestrador, como o
 * consumidor faria.
 */
export async function responderSaga(
  ctx: E2eContext,
  osId: string,
  tipo: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await ctx.app
    .get(ProcessarRespostaSagaUseCase)
    .execute(criarEnvelope(tipo, osId, 'fluxo-e2e', payload));
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
