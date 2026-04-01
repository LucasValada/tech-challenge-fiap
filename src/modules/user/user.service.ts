import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository.js';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUser(): Promise<{ message: string; user?: object }> {
    const message: string = 'Até aqui cheguei...';

    const user: object = await this.userRepository.getAllUser();

    const payload: { message: string; user?: object } = {
      message,
      user,
    };

    return payload;
  }
}
