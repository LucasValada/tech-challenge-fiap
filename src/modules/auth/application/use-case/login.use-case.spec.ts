import { Test, TestingModule } from '@nestjs/testing';
import { LoginUseCase } from './login.use-case';
import { AUTH_USER_REPOSITORY } from '../../domain/repository/auth-user.repository';
import { TOKEN_ISSUER } from '../../domain/service/token-issuer';
import { AUTH_HASHER } from '../../domain/service/password-hasher';
import { CredenciaisInvalidasError } from '../../domain/error/credenciais-invalidas.error';

const VALID_EMAIL = 'usuario.teste@example.com';
const UNKNOWN_EMAIL = 'sem-cadastro@example.com';
const PLAIN_INPUT_OK = 'plain-input-a';
const PLAIN_INPUT_BAD = 'plain-input-b';
const FAKE_HASH = 'fake-hash-for-tests';
const FAKE_TOKEN = 'fake-token-for-tests';

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
  email: VALID_EMAIL,
  senhaHash: FAKE_HASH,
};

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: AUTH_USER_REPOSITORY, useValue: mockAuthUserRepository },
        { provide: TOKEN_ISSUER, useValue: mockTokenIssuer },
        { provide: AUTH_HASHER, useValue: mockPasswordHasher },
      ],
    }).compile();

    useCase = moduleRef.get(LoginUseCase);
    jest.clearAllMocks();
  });

  describe('cenários de credenciais inválidas', () => {
    it('lança CredenciaisInvalidasError quando o email não existe', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        useCase.execute(UNKNOWN_EMAIL, PLAIN_INPUT_OK),
      ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
      expect(mockAuthUserRepository.findByEmail).toHaveBeenCalledWith(
        UNKNOWN_EMAIL,
      );
      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
    });

    it('lança CredenciaisInvalidasError quando o passwordHasher rejeita', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
      mockPasswordHasher.compare.mockResolvedValue(false);

      await expect(
        useCase.execute(VALID_EMAIL, PLAIN_INPUT_BAD),
      ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        PLAIN_INPUT_BAD,
        usuarioMock.senhaHash,
      );
      expect(mockTokenIssuer.sign).not.toHaveBeenCalled();
    });

    it('usa a mesma mensagem de erro para usuário inexistente e credencial errada', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(null);
      let erroUsuarioInexistente: CredenciaisInvalidasError | undefined;
      try {
        await useCase.execute(UNKNOWN_EMAIL, PLAIN_INPUT_OK);
      } catch (e) {
        erroUsuarioInexistente = e as CredenciaisInvalidasError;
      }

      mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
      mockPasswordHasher.compare.mockResolvedValue(false);
      let erroCredencialErrada: CredenciaisInvalidasError | undefined;
      try {
        await useCase.execute(VALID_EMAIL, PLAIN_INPUT_BAD);
      } catch (e) {
        erroCredencialErrada = e as CredenciaisInvalidasError;
      }

      expect(erroUsuarioInexistente?.message).toBe(erroCredencialErrada?.message);
    });
  });

  describe('cenário feliz', () => {
    it('retorna accessToken quando credenciais são válidas', async () => {
      mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockTokenIssuer.sign.mockResolvedValue(FAKE_TOKEN);

      const result = await useCase.execute(VALID_EMAIL, PLAIN_INPUT_OK);

      expect(result).toEqual({ accessToken: FAKE_TOKEN });
      expect(mockAuthUserRepository.findByEmail).toHaveBeenCalledWith(
        VALID_EMAIL,
      );
      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        PLAIN_INPUT_OK,
        usuarioMock.senhaHash,
      );
      expect(mockTokenIssuer.sign).toHaveBeenCalledWith({
        sub: usuarioMock.id,
        email: usuarioMock.email,
      });
    });
  });
});
