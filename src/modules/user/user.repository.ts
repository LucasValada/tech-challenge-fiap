import { UserUpdateDto, UsuarioCreateDto } from './dto/user.dto';
import { Usuario } from './user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';
export interface UserRepository {
  getAllUser(): Promise<Usuario[]>;

  getUserById(id: string): Promise<Usuario | null>;

  getUserByEmail(email: string): Promise<Usuario | null>;

  createUser(data: UsuarioCreateDto): Promise<Usuario>;

  updateUser(id: string, data: UserUpdateDto): Promise<Usuario>;

  deleteUser(id: string): Promise<Usuario>;
}
