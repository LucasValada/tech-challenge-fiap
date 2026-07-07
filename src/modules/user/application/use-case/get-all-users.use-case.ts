import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repository/user.repository';
import { UserListResponseDto } from '../dto/user.dto';
import { toUserResponse } from '../mappers/toUserResponse';

@Injectable()
export class GetAllUsersUseCase {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<UserListResponseDto> {
    const { user, count } = await this.userRepository.findAll();
    return { user: user.map(toUserResponse), count };
  }
}
