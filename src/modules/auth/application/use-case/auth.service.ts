import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../../domain/types';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../domain/repository/auth-user.repository';

export const CREDENCIAIS_INVALIDAS_MSG = 'Credenciais inválidas';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<{ accessToken: string }> {
    const usuario = await this.authUserRepository.findByEmail(email);
    if (!usuario) {
      throw new UnauthorizedException(CREDENCIAIS_INVALIDAS_MSG);
    }

    const senhaValida: boolean = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException(CREDENCIAIS_INVALIDAS_MSG);
    }

    const payload: JwtPayload = { sub: usuario.id, email: usuario.email };
    const accessToken: string = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}
