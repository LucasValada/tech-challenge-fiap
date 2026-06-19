export const AUTH_HASHER = 'AUTH_HASHER';

export interface PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}
