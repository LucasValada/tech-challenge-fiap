import { NotFoundException } from '@nestjs/common';
import { Usuario } from '../entity/User';
import { UserRepository } from '../repository/user.repository';

export async function buscarUsuarioOuFalhar(
  userRepository: UserRepository,
  id: string,
): Promise<Usuario> {
  const usuario = await userRepository.findById(id);
  if (!usuario) {
    throw new NotFoundException('Usuário não encontrado');
  }
  return usuario;
}
