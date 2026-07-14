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

  it('validate retorna user quando payload é válido', () => {
    const strategy = new JwtStrategy(mockConfig);
    const result = strategy.validate({ sub: 'uuid-1', email: 'a@b.com' });

    expect(result).toEqual({ id: 'uuid-1', email: 'a@b.com' });
  });

  it('validate lança UnauthorizedException quando payload é inválido', () => {
    const strategy = new JwtStrategy(mockConfig);

    expect(() => strategy.validate({} as any)).toThrow(UnauthorizedException);
    expect(() => strategy.validate({ sub: '', email: '' } as any)).toThrow(
      UnauthorizedException,
    );
  });
});
