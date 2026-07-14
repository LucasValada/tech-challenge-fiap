import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { PasswordHasher } from '../../domain/service/password-hasher';
import { generateRandomPassword } from '../../domain/services/generateRandomPassword';
import { garantirEmailUnico } from '../../domain/services/garantirEmailUnico';
import { UserCreatedResponseDto } from '../dto/user.dto';
import { toUserResponse } from '../mappers/toUserResponse';

const SENHA_GERADA_LENGTH = 8;

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    @Inject('PASSWORD_HASHER')
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(data: {
    email: string;
    nome: string;
  }): Promise<UserCreatedResponseDto> {
    const emailNormalizado = data.email.toLowerCase();
    await garantirEmailUnico(this.userRepository, emailNormalizado);

    const senhaGerada = generateRandomPassword(SENHA_GERADA_LENGTH);
    const senhaHash = await this.passwordHasher.hash(senhaGerada);

    const novoUsuario = await this.userRepository.create({
      email: emailNormalizado,
      nome: data.nome,
      senhaHash,
    });

    return {
      user: toUserResponse(novoUsuario),
      senhaGerada,
    };
  }
}
