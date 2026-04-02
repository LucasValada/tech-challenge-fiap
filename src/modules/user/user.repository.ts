import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Usuario } from '../../../generated/prisma/client.js';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  getAllUser(): Promise<Usuario[]> {
    return this.prisma.usuario.findMany();
  }

  async getUserById(id: string): Promise<Usuario | null> {
    const user = await this.prisma.usuario.findUnique({ where: { id } });

    if (!user) {
      return null;
    }

    return user;
  }
}
