import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { Usuario } from '../../domain/entity/User';

@Injectable()
export class GetAllUsersUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  execute(): Promise<{ user: Usuario[]; count: number }> {
    return this.userRepository.getAllUser();
  }
}
