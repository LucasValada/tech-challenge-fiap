import { Usuario } from '../../domain/entity/User';
import { UserResponseDto } from '../dto/user.dto';

export function toUserResponse(u: Usuario): UserResponseDto {
  return {
    id: u.id!,
    nome: u.nome,
    email: u.email,
    createdAt: u.createdAt!,
    updatedAt: u.updatedAt!,
  };
}
