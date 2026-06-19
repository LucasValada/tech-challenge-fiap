import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../domain/repository/auth-user.repository';
import {
  TOKEN_ISSUER,
  TokenIssuer,
} from '../../domain/service/token-issuer';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../domain/service/password-hasher';
import { CredenciaisInvalidasError } from '../../domain/error/credenciais-invalidas.error';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
    @Inject(TOKEN_ISSUER)
    private readonly tokenIssuer: TokenIssuer,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    email: string,
    senha: string,
  ): Promise<{ accessToken: string }> {
    const usuario = await this.authUserRepository.findByEmail(email);
    if (!usuario) {
      throw new CredenciaisInvalidasError();
    }

    const senhaValida = await this.passwordHasher.compare(
      senha,
      usuario.senhaHash,
    );
    if (!senhaValida) {
      throw new CredenciaisInvalidasError();
    }

    const accessToken = await this.tokenIssuer.sign({
      sub: usuario.id,
      email: usuario.email,
    });

    return { accessToken };
  }
}
