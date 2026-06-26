import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { Usuario } from '../../domain/entity/User';
import { PasswordHasher } from '../../domain/service/password-hasher';
import { generateRandomPassword } from '../../domain/services/generateRandomPassword';
import { garantirEmailUnico } from '../../domain/services/garantirEmailUnico';

const SENHA_GERADA_LENGTH = 8;

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    @Inject('PASSWORD_HASHER')
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(data: { email: string; nome: string }): Promise<Usuario> {
    const emailNormalizado = data.email.toLowerCase();
    await garantirEmailUnico(this.userRepository, emailNormalizado);

    const senha = generateRandomPassword(SENHA_GERADA_LENGTH);
    const senhaHash = await this.passwordHasher.hash(senha);

    const newUser = await this.userRepository.createUser({
      email: emailNormalizado,
      nome: data.nome,
      senhaHash,
    });

    newUser.senhaHash = senha;
    return newUser;
  }
}
