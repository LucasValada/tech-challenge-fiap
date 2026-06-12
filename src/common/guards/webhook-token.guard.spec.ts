import {
  ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { WebhookTokenGuard, WEBHOOK_TOKEN_ENV } from './webhook-token.guard';

function buildContext(headers: Record<string, string | undefined>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('WebhookTokenGuard', () => {
  let guard: WebhookTokenGuard;
  const originalEnv = process.env[WEBHOOK_TOKEN_ENV];

  beforeEach(() => {
    guard = new WebhookTokenGuard();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[WEBHOOK_TOKEN_ENV];
    } else {
      process.env[WEBHOOK_TOKEN_ENV] = originalEnv;
    }
  });

  it('permite acesso quando token bate exatamente com a env var', () => {
    process.env[WEBHOOK_TOKEN_ENV] = 'secret-token-123';
    const ctx = buildContext({ 'x-webhook-token': 'secret-token-123' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('lança UnauthorizedException quando header está ausente', () => {
    process.env[WEBHOOK_TOKEN_ENV] = 'secret-token-123';
    const ctx = buildContext({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando token está vazio', () => {
    process.env[WEBHOOK_TOKEN_ENV] = 'secret-token-123';
    const ctx = buildContext({ 'x-webhook-token': '' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando token não bate', () => {
    process.env[WEBHOOK_TOKEN_ENV] = 'secret-token-123';
    const ctx = buildContext({ 'x-webhook-token': 'wrong-token' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando tokens têm tamanhos diferentes', () => {
    process.env[WEBHOOK_TOKEN_ENV] = 'secret-token-123';
    const ctx = buildContext({ 'x-webhook-token': 'short' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('lança InternalServerErrorException quando env var não está configurada', () => {
    delete process.env[WEBHOOK_TOKEN_ENV];
    const ctx = buildContext({ 'x-webhook-token': 'qualquer' });

    expect(() => guard.canActivate(ctx)).toThrow(InternalServerErrorException);
  });
});
