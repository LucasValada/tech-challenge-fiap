import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { Usuario } from '../../domain/entity/User';

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<Usuario> {
    const user = await this.userRepository.getUserById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }
}
