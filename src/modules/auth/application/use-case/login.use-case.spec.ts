import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.use-case';

const VALID_EMAIL = 'usuario.teste@example.com';
const UNKNOWN_EMAIL = 'sem-cadastro@example.com';
const PLAIN_INPUT_OK = 'plain-input-a';
const PLAIN_INPUT_BAD = 'plain-input-b';
const FAKE_HASH = 'fake-hash-for-tests';
const FAKE_TOKEN = 'fake-token-for-tests';
const CREDENCIAIS_INVALIDAS_MSG = 'Credenciais inválidas';

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
        { provide: 'AUTH_USER_REPOSITORY', useValue: mockAuthUserRepository },
        { provide: 'TOKEN_ISSUER', useValue: mockTokenIssuer },
        { provide: 'PASSWORD_HASHER', useValue: mockPasswordHasher },
      ],
    }).compile();

    useCase = moduleRef.get(LoginUseCase);
    jest.clearAllMocks();
  });

  it('lança UnauthorizedException quando o email não existe', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(null);

    const promessa = useCase.execute(UNKNOWN_EMAIL, PLAIN_INPUT_OK);

    await expect(promessa).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promessa).rejects.toThrow(CREDENCIAIS_INVALIDAS_MSG);
    expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
  });

  it('lança UnauthorizedException quando o passwordHasher rejeita', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
    mockPasswordHasher.compare.mockResolvedValue(false);

    const promessa = useCase.execute(VALID_EMAIL, PLAIN_INPUT_BAD);

    await expect(promessa).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promessa).rejects.toThrow(CREDENCIAIS_INVALIDAS_MSG);
    expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
      PLAIN_INPUT_BAD,
      usuarioMock.senhaHash,
    );
    expect(mockTokenIssuer.sign).not.toHaveBeenCalled();
  });

  it('usa a mesma mensagem para usuário inexistente e credencial errada', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(null);
    let erroUsuarioInexistente: UnauthorizedException | undefined;
    try {
      await useCase.execute(UNKNOWN_EMAIL, PLAIN_INPUT_OK);
    } catch (e) {
      erroUsuarioInexistente = e as UnauthorizedException;
    }

    mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
    mockPasswordHasher.compare.mockResolvedValue(false);
    let erroCredencialErrada: UnauthorizedException | undefined;
    try {
      await useCase.execute(VALID_EMAIL, PLAIN_INPUT_BAD);
    } catch (e) {
      erroCredencialErrada = e as UnauthorizedException;
    }

    expect(erroUsuarioInexistente?.message).toBe(erroCredencialErrada?.message);
  });

  it('retorna accessToken quando credenciais são válidas', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
    mockPasswordHasher.compare.mockResolvedValue(true);
    mockTokenIssuer.sign.mockResolvedValue(FAKE_TOKEN);

    const result = await useCase.execute(VALID_EMAIL, PLAIN_INPUT_OK);

    expect(result).toEqual({ accessToken: FAKE_TOKEN });
    expect(mockTokenIssuer.sign).toHaveBeenCalledWith({
      sub: usuarioMock.id,
      email: usuarioMock.email,
    });
  });
});
