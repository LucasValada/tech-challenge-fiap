import { AuthUser } from '../types/auth-user';

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
}
