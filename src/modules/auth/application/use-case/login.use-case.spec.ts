import { Test, TestingModule } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { AUTH_USER_REPOSITORY } from '../../domain/repository/auth-user.repository';
import { TOKEN_ISSUER } from '../../domain/service/token-issuer';
import { PASSWORD_HASHER } from '../../domain/service/password-hasher';
import { CredenciaisInvalidasError } from '../../domain/error/credenciais-invalidas.error';

const mockAuthUserRepository = {
  findByEmail: jest.fn(),
};

const mockTokenIssuer = {
  sign: jest.fn(),
};

const mockPasswordHasher = {
  compare: jest.fn(),
};

const usuarioMock = {
  id: 'uuid-123',
  email: 'admin@oficina.com',
  senhaHash: '$2b$10$hashedpassword',
};

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: AUTH_USER_REPOSITORY, useValue: mockAuthUserRepository },
        { provide: TOKEN_ISSUER, useValue: mockTokenIssuer },
        { provide: PASSWORD_HASHER, useValue: mockPasswordHasher },
      ],
    }).compile();

    useCase = moduleRef.get(LoginUseCase);
    jest.clearAllMocks();
  });

  describe('cenários de credenciais inválidas', () => {
    it('lança CredenciaisInvalidasError quando o email não existe', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        useCase.execute('naoexiste@email.com', 'senha123'),
      ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
      expect(mockAuthUserRepository.findByEmail).toHaveBeenCalledWith(
        'naoexiste@email.com',
      );
      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
    });

    it('lança CredenciaisInvalidasError quando a senha está errada', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
      mockPasswordHasher.compare.mockResolvedValue(false);

      await expect(
        useCase.execute('admin@oficina.com', 'senhaerrada'),
      ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        'senhaerrada',
        usuarioMock.senhaHash,
      );
      expect(mockTokenIssuer.sign).not.toHaveBeenCalled();
    });

    it('usa a mesma mensagem de erro para usuário inexistente e senha errada', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(null);
      let erroUsuarioInexistente: CredenciaisInvalidasError | undefined;
      try {
        await useCase.execute('naoexiste@email.com', 'senha123');
      } catch (e) {
        erroUsuarioInexistente = e as CredenciaisInvalidasError;
      }

      mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
      mockPasswordHasher.compare.mockResolvedValue(false);
      let erroSenhaErrada: CredenciaisInvalidasError | undefined;
      try {
        await useCase.execute('admin@oficina.com', 'senhaerrada');
      } catch (e) {
        erroSenhaErrada = e as CredenciaisInvalidasError;
      }

      expect(erroUsuarioInexistente?.message).toBe(erroSenhaErrada?.message);
    });
  });

  describe('cenário feliz', () => {
    it('retorna accessToken quando email e senha são válidos', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockTokenIssuer.sign.mockResolvedValue('token-jwt-fake');

      const result = await useCase.execute('admin@oficina.com', 'senha123');

      expect(result).toEqual({ accessToken: 'token-jwt-fake' });
      expect(mockAuthUserRepository.findByEmail).toHaveBeenCalledWith(
        'admin@oficina.com',
      );
      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        'senha123',
        usuarioMock.senhaHash,
      );
      expect(mockTokenIssuer.sign).toHaveBeenCalledWith({
        sub: usuarioMock.id,
        email: usuarioMock.email,
      });
    });
  });
});
