import { ConflictException } from '@nestjs/common';
import { UserRepository } from '../repository/user.repository';

export class EmailPolicyService {
  constructor(
    private readonly userRepository: UserRepository,
    public email: string,
  ) {}

  async IsDuplicate(excludeId?: string): Promise<void> {
    const alreadyExist = await this.userRepository.getUserByEmail(
      this.email,
      excludeId,
    );

    if (alreadyExist) {
      throw new ConflictException('Email ja cadastrado');
    }

    return;
  }
}
