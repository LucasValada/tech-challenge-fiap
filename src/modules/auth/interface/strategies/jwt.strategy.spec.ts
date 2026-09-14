import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const mockConfig = {
    get: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  it('instancia com JWT_SECRET definido', () => {
    const strategy = new JwtStrategy(mockConfig);
    expect(strategy).toBeDefined();
  });

  it('lança erro quando JWT_SECRET não está definido', () => {
    const emptyConfig = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    expect(() => new JwtStrategy(emptyConfig)).toThrow(
      'JWT_SECRET não está definida.',
    );
  });

  it('validate retorna admin para token de email/senha', () => {
    const strategy = new JwtStrategy(mockConfig);
    const result = strategy.validate({ sub: 'uuid-1', email: 'a@b.com' });

    expect(result).toEqual({ id: 'uuid-1', tipo: 'admin', email: 'a@b.com' });
  });

  it('validate retorna cliente para token da Lambda (auth por CPF)', () => {
    const strategy = new JwtStrategy(mockConfig);
    const result = strategy.validate({
      sub: 'cliente-uuid',
      tipo: 'cliente',
      cpf: '529.982.247-25',
      nome: 'Fulano',
    });

    expect(result).toEqual({
      id: 'cliente-uuid',
      tipo: 'cliente',
      cpf: '529.982.247-25',
      nome: 'Fulano',
    });
  });

  it('validate lança UnauthorizedException quando payload é inválido', () => {
    const strategy = new JwtStrategy(mockConfig);

    expect(() => strategy.validate({} as any)).toThrow(UnauthorizedException);
    expect(() => strategy.validate({ sub: '', email: '' } as any)).toThrow(
      UnauthorizedException,
    );
    // sub presente mas sem email e sem tipo de cliente: não identificável.
    expect(() => strategy.validate({ sub: 'uuid-1' } as any)).toThrow(
      UnauthorizedException,
    );
  });
});
