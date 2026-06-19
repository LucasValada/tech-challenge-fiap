export const PASSWORD_HASHER = 'PASSWORD_HASHER';

export interface PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}
