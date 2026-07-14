import { Inject, Injectable } from '@nestjs/common';
import {
  UpdateUserData,
  UserRepository,
} from '../../domain/repository/user.repository';
import { buscarUsuarioOuFalhar } from '../../domain/services/buscarUsuarioOuFalhar';
import { garantirEmailUnico } from '../../domain/services/garantirEmailUnico';
import { UserResponseDto } from '../dto/user.dto';
import { toUserResponse } from '../mappers/toUserResponse';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    id: string,
    data: { email?: string; nome?: string },
  ): Promise<UserResponseDto> {
    await buscarUsuarioOuFalhar(this.userRepository, id);

    const patch: UpdateUserData = {};
    if (data.nome !== undefined) {
      patch.nome = data.nome;
    }
    if (data.email !== undefined) {
      const emailNormalizado = data.email.toLowerCase();
      await garantirEmailUnico(this.userRepository, emailNormalizado, id);
      patch.email = emailNormalizado;
    }

    const atualizado = await this.userRepository.update(id, patch);
    return toUserResponse(atualizado);
  }
}
