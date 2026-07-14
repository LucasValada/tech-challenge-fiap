import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { Usuario } from '../../../../modules/user/domain/entity/User';
import {
  CreateUserData,
  UpdateUserData,
  UserRepository,
} from '../../../../modules/user/domain/repository/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<Usuario> {
    return this.prisma.usuario.create({ data });
  }

  async findAll(): Promise<{ user: Usuario[]; count: number }> {
    const user = await this.prisma.usuario.findMany();
    return { user, count: user.length };
  }

  async findById(id: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  async findByEmail(email: string, excludeId?: string): Promise<Usuario | null> {
    const where = excludeId ? { email, NOT: { id: excludeId } } : { email };
    return this.prisma.usuario.findUnique({ where });
  }

  async update(id: string, data: UpdateUserData): Promise<Usuario> {
    return this.prisma.usuario.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Usuario> {
    return this.prisma.usuario.delete({ where: { id } });
  }
}
