import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository.js';
import { OneUserResponse, UserResponse } from './user.types.js';
import { Usuario } from '../../generated/prisma/client.js';
import { UsuarioCreateInput } from '../../generated/prisma/models.js';

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
      throw new Error('Usuário não encontrado');
    }
    const message: string = 'Usuário encontrado com sucesso';

    const payload: OneUserResponse = {
      message,
      user,
      error: false,
    };
    return payload;
  }

  async createUser(data: UsuarioCreateInput): Promise<Usuario> {
    data.email = data.email.toLowerCase();

    //funcao para verificar se o email ja esta cadastrado
    const user = await this.userRepository.getUserByEmail(data.email);
    if (user) {
      throw new Error('Email ja cadastrado');
    }

    return await this.userRepository.createUser(data);
  }

  async updateUser(id: string, data: UsuarioCreateInput): Promise<Usuario> {
    data.email = data.email.toLowerCase();

    //funcao para verificar se o email ja esta cadastrado
    const user = await this.userRepository.getUserByEmail(data.email);
    if (user) {
      throw new Error('Email ja cadastrado');
    }

    return await this.userRepository.updateUser(id, data);
  }
}
