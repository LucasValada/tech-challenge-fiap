import { ConflictException } from '@nestjs/common';
import { UserRepository } from '../repository/user.repository';

export async function garantirEmailUnico(
  userRepository: UserRepository,
  email: string,
  excludeId?: string,
): Promise<void> {
  const existente = await userRepository.findByEmail(email, excludeId);
  if (existente) {
    throw new ConflictException('Email já cadastrado');
  }
}
