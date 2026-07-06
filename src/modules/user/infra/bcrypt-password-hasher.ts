import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../domain/service/password-hasher';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }
}
