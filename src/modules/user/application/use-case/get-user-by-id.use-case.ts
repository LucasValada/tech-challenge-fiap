import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { buscarUsuarioOuFalhar } from '../../domain/services/buscarUsuarioOuFalhar';
import { UserResponseDto } from '../dto/user.dto';
import { toUserResponse } from '../mappers/toUserResponse';

@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<UserResponseDto> {
    const usuario = await buscarUsuarioOuFalhar(this.userRepository, id);
    return toUserResponse(usuario);
  }
}
