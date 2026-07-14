import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../domain/service/password-hasher';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
