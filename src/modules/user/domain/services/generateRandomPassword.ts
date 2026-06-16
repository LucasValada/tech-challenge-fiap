import { randomInt } from 'node:crypto';

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateRandomPassword(length = 8): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += CHARS.charAt(randomInt(CHARS.length));
  }
  return password;
}
