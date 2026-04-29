import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { Usuario } from '../../../../modules/user/domain/entity/User';
import {
  UsuarioCreateInput,
  UsuarioUpdateInput,
} from '../../../../generated/prisma/models';
import { UserRepository } from '../../../../modules/user/domain/repository/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUser(): Promise<{ user: Usuario[]; count: number }> {
    const user = await this.prisma.usuario.findMany();
    return { user, count: user.length };
  }

  async getUserById(id: string): Promise<Usuario | null> {
    const user = await this.prisma.usuario.findUnique({ where: { id } });

    return user;
  }

  async getUserByEmail(
    email: string,
    excludeId?: string,
  ): Promise<Usuario | null> {
    const where = excludeId ? { email, NOT: { id: excludeId } } : { email };

    const user = await this.prisma.usuario.findUnique({ where });
    return user;
  }

  async createUser(data: UsuarioCreateInput): Promise<Usuario> {
    const user = await this.prisma.usuario.create({ data });
    return user;
  }

  async updateUser(id: string, data: UsuarioUpdateInput): Promise<Usuario> {
    const user = await this.prisma.usuario.update({ where: { id }, data });
    return user;
  }

  async deleteUser(id: string): Promise<Usuario> {
    const user = await this.prisma.usuario.delete({ where: { id } });
    return user;
  }
}
