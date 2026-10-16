import {
  ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { INTERNAL_TOKEN_ENV, InternalTokenGuard } from './internal-token.guard';

function contexto(headers: Record<string, string | undefined>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('InternalTokenGuard', () => {
  const guard = new InternalTokenGuard();
  const original = process.env[INTERNAL_TOKEN_ENV];

  beforeEach(() => {
    process.env[INTERNAL_TOKEN_ENV] = 'token-interno-123';
  });

  afterAll(() => {
    if (original === undefined) delete process.env[INTERNAL_TOKEN_ENV];
    else process.env[INTERNAL_TOKEN_ENV] = original;
  });

  it('libera com o token certo', () => {
    expect(
      guard.canActivate(contexto({ 'x-internal-token': 'token-interno-123' })),
    ).toBe(true);
  });

  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['errado, do mesmo tamanho', 'token-interno-999'],
    ['de outro tamanho', 'curto'],
  ])('recusa token %s com 401', (_caso, token) => {
    expect(() =>
      guard.canActivate(contexto({ 'x-internal-token': token })),
    ).toThrow(UnauthorizedException);
  });

  it('sem o token configurado no ambiente, falha com 500 em vez de liberar', () => {
    delete process.env[INTERNAL_TOKEN_ENV];

    expect(() =>
      guard.canActivate(contexto({ 'x-internal-token': 'qualquer' })),
    ).toThrow(InternalServerErrorException);
  });
});
