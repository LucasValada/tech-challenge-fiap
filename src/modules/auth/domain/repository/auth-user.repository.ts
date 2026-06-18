import { AuthUser } from '../types/auth-user';

export const AUTH_USER_REPOSITORY = 'AUTH_USER_REPOSITORY';

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
}
