import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UsuarioCreateInput,
  UsuarioUpdateInput,
} from '../../generated/prisma/models';
import { Usuario } from './user.entity';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async getAllUser(): Promise<Usuario[]> {
    const user = await this.prisma.usuario.findMany();
    return user;
  }

  async getUserById(id: string): Promise<Usuario | null> {
    const user = await this.prisma.usuario.findUnique({ where: { id } });

    return user;
  }

  async getUserByEmail(email: string): Promise<Usuario | null> {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
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
