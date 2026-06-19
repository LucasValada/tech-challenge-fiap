import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { LoginUseCase } from '../../application/use-case/login.use-case';
import { CredenciaisInvalidasError } from '../../domain/error/credenciais-invalidas.error';

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

  it('encaminha email e senha para LoginUseCase.execute e retorna o token', async () => {
    mockLoginUseCase.execute.mockResolvedValue({ accessToken: 'token-fake' });

    const result = await controller.login({
      email: 'admin@oficina.com',
      senha: 'senha123',
    });

    expect(result).toEqual({ accessToken: 'token-fake' });
    expect(mockLoginUseCase.execute).toHaveBeenCalledWith(
      'admin@oficina.com',
      'senha123',
    );
  });

  it('traduz CredenciaisInvalidasError para UnauthorizedException', async () => {
    mockLoginUseCase.execute.mockRejectedValue(new CredenciaisInvalidasError());

    await expect(
      controller.login({ email: 'admin@oficina.com', senha: 'senhaerrada' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.login({ email: 'admin@oficina.com', senha: 'senhaerrada' }),
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('propaga erros inesperados sem traduzir', async () => {
    const erroInesperado = new Error('Falha qualquer');
    mockLoginUseCase.execute.mockRejectedValue(erroInesperado);

    await expect(
      controller.login({ email: 'admin@oficina.com', senha: 'senha123' }),
    ).rejects.toBe(erroInesperado);
  });
});
