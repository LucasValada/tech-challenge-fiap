import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { USER_REPOSITORY, UserRepository } from '../../domain/repository/user.repository.js';
import { OneUserResponse, UserResponse } from '../dto/user.dto.js';
import { Usuario } from '../../../../generated/prisma/client.js';
import { generateRandomPassword } from '../../domain/services/generateRandomPassword.js';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private userRepository: UserRepository,
  ) {}

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
      throw new NotFoundException('Usuário nao encontrado');
    }

    const message: string = 'Usuário encontrado com sucesso';

    const payload: OneUserResponse = {
      message,
      user,
      error: false,
    };
    return payload;
  }

  async createUser(data: { email: string; nome: string }): Promise<Usuario> {
    const senha = generateRandomPassword(8);
    const senhaHash = await bcrypt.hash(senha, 10);

    console.log(senha)

    const payload = {
      email: data.email.toLowerCase(),
      nome: data.nome,
      senhaHash,
    };

    const user = await this.userRepository.getUserByEmail(payload.email);
    if (user) {
      throw new ConflictException('Email ja cadastrado');
    }

    return await this.userRepository.createUser(payload);
  }

  async updateUser(
    id: string,
    data: {
      email: string;
      nome: string;
    },
  ): Promise<Usuario> {
    data.email = data.email.toLowerCase();

    const target: Usuario | null = await this.userRepository.getUserById(id);

    if (!target) {
      throw new NotFoundException('Usuário nao encontrado');
    }

    const duplicate = await this.userRepository.getUserByEmail(data.email);
    if (duplicate) {
      throw new ConflictException('Email ja cadastrado');
    }

    return await this.userRepository.updateUser(id, data);
  }

  async deleteUser(id: string): Promise<Usuario> {
    const user = await this.userRepository.getUserById(id);
    if (!user) {
      throw new NotFoundException('Usuário nao encontrado');
    }
    return await this.userRepository.deleteUser(id);
  }

  async getUserByEmail(email: string): Promise<Usuario | null> {
    return await this.userRepository.getUserByEmail(email);
  }
}
