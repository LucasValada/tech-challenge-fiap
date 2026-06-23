import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { Usuario } from '../../domain/entity/User';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<Usuario> {
    const user = await this.userRepository.getUserById(id);
    if (!user) {
      throw new NotFoundException('Usuário nao encontrado');
    }
    return this.userRepository.deleteUser(id);
  }
}
