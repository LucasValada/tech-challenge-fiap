import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repository/user.repository';
import { Usuario } from '../../domain/entity/User';
import { generateRandomPassword } from '../../domain/services/generateRandomPassword';
import { garantirEmailUnico } from '../../domain/services/garantirEmailUnico';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async getAllUser(): Promise<{ user: Usuario[]; count: number }> {
    return this.userRepository.getAllUser();
  }

  async getUserById(id: string): Promise<Usuario> {
    const user = await this.userRepository.getUserById(id);
    if (!user) {
      throw new NotFoundException('Usuário nao encontrado');
    }
    return user;
  }

  async createUser(data: { email: string; nome: string }): Promise<Usuario> {
    const emailNormalizado = data.email.toLowerCase();
    await garantirEmailUnico(this.userRepository, emailNormalizado);

    const senha = generateRandomPassword(8);
    const senhaHash = await bcrypt.hash(senha, 10);

    const newUser = await this.userRepository.createUser({
      email: emailNormalizado,
      nome: data.nome,
      senhaHash,
    });

    newUser.senhaHash = senha;
    return newUser;
  }

  async updateUser(
    id: string,
    data: { email: string; nome: string },
  ): Promise<Usuario> {
    const emailNormalizado = data.email.toLowerCase();
    await garantirEmailUnico(this.userRepository, emailNormalizado, id);

    const target = await this.userRepository.getUserById(id);
    if (!target) {
      throw new NotFoundException('Usuário nao encontrado');
    }

    return this.userRepository.updateUser(id, {
      email: emailNormalizado,
      nome: data.nome,
    });
  }

  async deleteUser(id: string): Promise<Usuario> {
    const user = await this.userRepository.getUserById(id);
    if (!user) {
      throw new NotFoundException('Usuário nao encontrado');
    }
    return this.userRepository.deleteUser(id);
  }

  async getUserByEmail(email: string): Promise<Usuario | null> {
    return this.userRepository.getUserByEmail(email);
  }
}
