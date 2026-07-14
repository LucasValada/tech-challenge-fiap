export interface PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}
