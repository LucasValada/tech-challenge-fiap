import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../interface/controller/auth.controller';
import { AuthService } from '../application/use-case/auth.service';

const mockAuthService = {
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('deve encaminhar email e senha para AuthService.login e retornar o token', async () => {
    mockAuthService.login.mockResolvedValue({ accessToken: 'token-fake' });

    const result = await controller.login({
      email: 'admin@oficina.com',
      senha: 'senha123',
    });

    expect(result).toEqual({ accessToken: 'token-fake' });
    expect(mockAuthService.login).toHaveBeenCalledWith(
      'admin@oficina.com',
      'senha123',
    );
  });

  it('deve propagar erros lançados pelo AuthService', async () => {
    mockAuthService.login.mockRejectedValue(
      new UnauthorizedException('Credenciais inválidas'),
    );

    await expect(
      controller.login({ email: 'admin@oficina.com', senha: 'senhaerrada' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
