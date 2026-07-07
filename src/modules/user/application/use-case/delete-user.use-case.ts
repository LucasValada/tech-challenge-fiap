import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { buscarUsuarioOuFalhar } from '../../domain/services/buscarUsuarioOuFalhar';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await buscarUsuarioOuFalhar(this.userRepository, id);
    await this.userRepository.delete(id);
  }
}
