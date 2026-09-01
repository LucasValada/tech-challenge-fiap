import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import {
  AuthenticatedUser,
  TipoUsuarioAutenticado,
} from '../../modules/auth/domain/types';
import { ROLES_KEY } from '../decorators';

/**
 * Valida o JWT e aplica controle de papel. A estratégia distingue tokens de
 * admin (login por email/senha) e de cliente (autenticação por CPF via Lambda).
 *
 * Sem `@Roles(...)` na rota, exige `admin` — assim toda rota administrativa
 * continua fechada ao cliente por padrão. `@Roles('cliente')` libera as rotas
 * de autenticação por CPF.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: unknown,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err) throw err;
    if (!user) throw new UnauthorizedException();

    const rolesPermitidos = this.reflector.getAllAndOverride<
      TipoUsuarioAutenticado[]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]) ?? ['admin'];

    if (!rolesPermitidos.includes((user as AuthenticatedUser).tipo)) {
      throw new ForbiddenException(
        'Token não autorizado para este recurso.',
      );
    }

    return user as TUser;
  }
}
