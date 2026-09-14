import { SetMetadata } from '@nestjs/common';
import { TipoUsuarioAutenticado } from '../../modules/auth/domain/types';

export const ROLES_KEY = 'roles';

/**
 * Restringe uma rota aos tipos de usuário informados. Sem o decorator, o
 * JwtAuthGuard assume apenas `admin` — mantendo protegidas por padrão as rotas
 * administrativas. Use `@Roles('cliente')` nas rotas de autenticação por CPF.
 */
export const Roles = (...roles: TipoUsuarioAutenticado[]) =>
  SetMetadata(ROLES_KEY, roles);
