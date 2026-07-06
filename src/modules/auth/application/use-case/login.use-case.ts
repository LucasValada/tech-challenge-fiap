import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUserRepository } from '../../domain/repository/auth-user.repository';
import { TokenIssuer } from '../../domain/service/token-issuer';
import { PasswordHasher } from '../../domain/service/password-hasher';

const CREDENCIAIS_INVALIDAS_MSG = 'Credenciais inválidas';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('AUTH_USER_REPOSITORY')
    private readonly authUserRepository: AuthUserRepository,
    @Inject('TOKEN_ISSUER')
    private readonly tokenIssuer: TokenIssuer,
    @Inject('PASSWORD_HASHER')
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    email: string,
    senha: string,
  ): Promise<{ accessToken: string }> {
    const usuario = await this.authUserRepository.findByEmail(email);
    if (!usuario) {
      throw new UnauthorizedException(CREDENCIAIS_INVALIDAS_MSG);
    }

    const senhaValida = await this.passwordHasher.compare(
      senha,
      usuario.senhaHash,
    );
    if (!senhaValida) {
      throw new UnauthorizedException(CREDENCIAIS_INVALIDAS_MSG);
    }

    const accessToken = await this.tokenIssuer.sign({
      sub: usuario.id,
      email: usuario.email,
    });

    return { accessToken };
  }
}
