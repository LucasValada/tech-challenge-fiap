import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { LoginUseCase } from '../../application/use-case/login.use-case';

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

  it('propaga UnauthorizedException do use case', async () => {
    mockLoginUseCase.execute.mockRejectedValue(
      new UnauthorizedException('Credenciais inválidas'),
    );

    await expect(
      controller.login({ email: VALID_EMAIL, senha: PLAIN_INPUT_BAD }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
