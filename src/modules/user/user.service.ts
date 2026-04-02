import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository.js';
import { Usuario } from '../../../generated/prisma/client.js';
import { OneUserResponse, UserResponse } from './user.types.js';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUser(): Promise<UserResponse> {
    const user: Usuario[] = await this.userRepository.getAllUser();
    const message: string = 'Usuários encontrados com sucesso';

    const payload: { message: string; user: Usuario[]; error: boolean } = {
      message,
      user,
      error: false,
    };

    return payload;
  }

  async getUserById(id: string): Promise<OneUserResponse> {
    const user: Usuario | null = await this.userRepository.getUserById(id);

    if (!user) {
      const message: string = 'Usuário nao encontrado';

      const payload: OneUserResponse = {
        message,
        user: null,
        error: false,
      };
      return payload;
    }
    const message: string = 'Usuário encontrado com sucesso';

    const payload: OneUserResponse = {
      message,
      user,
      error: false,
    };
    return payload;
  }
}
