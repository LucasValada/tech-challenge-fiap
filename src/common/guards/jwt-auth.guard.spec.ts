import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextFake(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('estende AuthGuard configurado com estratégia "jwt"', () => {
    const guard = new JwtAuthGuard(new Reflector());
    expect(guard).toBeInstanceOf(AuthGuard('jwt'));
  });

  it('sem @Roles exige admin (default)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);

    const admin = { id: '1', tipo: 'admin' as const };
    expect(guard.handleRequest(null, admin, null, contextFake())).toBe(admin);

    expect(() =>
      guard.handleRequest(
        null,
        { id: '2', tipo: 'cliente' },
        null,
        contextFake(),
      ),
    ).toThrow(ForbiddenException);
  });

  it('@Roles("cliente") aceita cliente e recusa admin', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['cliente']),
    };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);

    const cliente = { id: '2', tipo: 'cliente' as const };
    expect(guard.handleRequest(null, cliente, null, contextFake())).toBe(
      cliente,
    );

    expect(() =>
      guard.handleRequest(null, { id: '1', tipo: 'admin' }, null, contextFake()),
    ).toThrow(ForbiddenException);
  });

  it('lança UnauthorizedException sem usuário', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);

    expect(() => guard.handleRequest(null, null, null, contextFake())).toThrow(
      UnauthorizedException,
    );
  });
});
