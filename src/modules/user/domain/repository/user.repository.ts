import { Usuario } from '../entity/User';

export interface CreateUserData {
  nome: string;
  email: string;
  senhaHash: string;
}

export interface UpdateUserData {
  nome?: string;
  email?: string;
}

export interface UserRepository {
  create(data: CreateUserData): Promise<Usuario>;
  findAll(): Promise<{ user: Usuario[]; count: number }>;
  findById(id: string): Promise<Usuario | null>;
  findByEmail(email: string, excludeId?: string): Promise<Usuario | null>;
  update(id: string, data: UpdateUserData): Promise<Usuario>;
  delete(id: string): Promise<Usuario>;
}
