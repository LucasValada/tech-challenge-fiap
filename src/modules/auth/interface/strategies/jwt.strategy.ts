import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '../../domain/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET não está definida.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }

    // Token de cliente emitido pela Lambda de autenticação por CPF.
    if (payload.tipo === 'cliente') {
      return {
        id: payload.sub,
        tipo: 'cliente',
        cpf: payload.cpf,
        nome: payload.nome,
      };
    }

    // Token administrativo (login por email/senha).
    if (payload.email) {
      return { id: payload.sub, tipo: 'admin', email: payload.email };
    }

    throw new UnauthorizedException();
  }
}
