import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { LoginUseCase } from '../../application/use-case/login.use-case';
import { CredenciaisInvalidasError } from '../../domain/error/credenciais-invalidas.error';

const VALID_EMAIL = 'usuario.teste@example.com';
const PLAIN_INPUT_OK = 'plain-input-a';
const PLAIN_INPUT_BAD = 'plain-input-b';
const FAKE_TOKEN = 'fake-token-for-tests';

const mockLoginUseCase = {
  execute: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: LoginUseCase, useValue: mockLoginUseCase }],
    }).compile();

    controller = moduleRef.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('encaminha email e plain input para LoginUseCase.execute e retorna o token', async () => {
    mockLoginUseCase.execute.mockResolvedValue({ accessToken: FAKE_TOKEN });

    const result = await controller.login({
      email: VALID_EMAIL,
      senha: PLAIN_INPUT_OK,
    });

    expect(result).toEqual({ accessToken: FAKE_TOKEN });
    expect(mockLoginUseCase.execute).toHaveBeenCalledWith(
      VALID_EMAIL,
      PLAIN_INPUT_OK,
    );
  });

  it('traduz CredenciaisInvalidasError para UnauthorizedException', async () => {
    mockLoginUseCase.execute.mockRejectedValue(new CredenciaisInvalidasError());

    await expect(
      controller.login({ email: VALID_EMAIL, senha: PLAIN_INPUT_BAD }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.login({ email: VALID_EMAIL, senha: PLAIN_INPUT_BAD }),
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('propaga erros inesperados sem traduzir', async () => {
    const erroInesperado = new Error('Falha qualquer');
    mockLoginUseCase.execute.mockRejectedValue(erroInesperado);

    await expect(
      controller.login({ email: VALID_EMAIL, senha: PLAIN_INPUT_OK }),
    ).rejects.toBe(erroInesperado);
  });
});
