import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  getUser(): string {
    const payload: string = 'Até aqui cheguei...';
    return payload;
  }
}
