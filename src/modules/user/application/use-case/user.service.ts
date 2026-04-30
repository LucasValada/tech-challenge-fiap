import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repository/user.repository.js';
import { Usuario } from '../../../../generated/prisma/client.js';
import { generateRandomPassword } from '../../domain/services/generateRandomPassword.js';
import { EmailPolicyService } from '../../domain/services/EmailPolicy.js';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async getAllUser(): Promise<{ user: Usuario[]; count: number }> {
    const user = await this.userRepository.getAllUser();

    return user;
  }

  async getUserById(id: string): Promise<Usuario> {
    const user = await this.userRepository.getUserById(id);

    if (!user) {
      throw new NotFoundException('Usuário nao encontrado');
    }

    return user;
  }

  async createUser(data: { email: string; nome: string }): Promise<Usuario> {
    const senha = generateRandomPassword(8);
    const senhaHash = await bcrypt.hash(senha, 10);

    // para verificar a senha criada
    console.log(senha);

    const email = new EmailPolicyService(this.userRepository, data.email);
    await email.IsDuplicate();

    const payload = {
      email: email.email.toLowerCase(),
      nome: data.nome,
      senhaHash,
    };

    const newUser = await this.userRepository.createUser(payload);

    newUser.senhaHash = senha;

    return newUser;
  }

  async updateUser(
    id: string,
    data: {
      email: string;
      nome: string;
    },
  ): Promise<Usuario> {
    const email = new EmailPolicyService(this.userRepository, data.email);
    await email.IsDuplicate(id);

    const target = await this.userRepository.getUserById(id);

    if (!target) {
      throw new NotFoundException('Usuário nao encontrado');
    }

    const payload = {
      email: email.email.toLowerCase(),
      nome: data.nome,
    };

    const user = await this.userRepository.updateUser(id, payload);

    return user;
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
