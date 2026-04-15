import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { JwtPayload } from "./types";
import { UserService } from "../user/user.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly UserService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<{ accessToken: string }> {
    const usuario = await this.UserService.getUserByEmail(email);
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
