import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./types";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUsuarioByEmail(email: string): Promise<AuthUser | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, email: true, senhaHash: true },
    });
    return usuario;
  }
}
