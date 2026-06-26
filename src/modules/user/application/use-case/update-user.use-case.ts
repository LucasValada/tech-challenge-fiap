import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { Usuario } from '../../domain/entity/User';
import { garantirEmailUnico } from '../../domain/services/garantirEmailUnico';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
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
}
