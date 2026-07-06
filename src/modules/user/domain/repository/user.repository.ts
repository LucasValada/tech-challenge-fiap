import { Usuario } from '../entity/User';

export interface CreateUserData {
  nome: string;
  email: string;
  senhaHash: string;
}

export interface UpdateUserData {
  nome: string;
  email: string;
}

export interface UserRepository {
  getAllUser(): Promise<{ user: Usuario[]; count: number }>;
  getUserById(id: string): Promise<Usuario | null>;
  getUserByEmail(email: string, excludeId?: string): Promise<Usuario | null>;
  createUser(data: CreateUserData): Promise<Usuario>;
  updateUser(id: string, data: UpdateUserData): Promise<Usuario>;
  deleteUser(id: string): Promise<Usuario>;
}
