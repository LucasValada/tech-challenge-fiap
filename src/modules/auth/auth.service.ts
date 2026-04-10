import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthRepository } from "./auth.repository";
import { JwtPayload } from "./types";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<{ accessToken: string }> {
    const usuario = await this.authRepository.findUsuarioByEmail(email);
    if (!usuario) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const senhaValida: boolean = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const payload: JwtPayload = { sub: usuario.id, email: usuario.email };
    const accessToken: string = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}
