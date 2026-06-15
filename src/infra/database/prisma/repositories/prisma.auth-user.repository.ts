import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../modules/prisma/prisma.service';
import { AuthUser } from '../../../../modules/auth/domain/types/auth-user';
import { AuthUserRepository } from '../../../../modules/auth/domain/repository/auth-user.repository';

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return null;
    return {
      id: usuario.id,
      email: usuario.email,
      senhaHash: usuario.senhaHash,
    };
  }
}
