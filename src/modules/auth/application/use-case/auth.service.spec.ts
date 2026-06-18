import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService, CREDENCIAIS_INVALIDAS_MSG } from './auth.service';
import { AUTH_USER_REPOSITORY } from '../../domain/repository/auth-user.repository';

jest.mock('bcrypt');

const mockAuthUserRepository = {
  findByEmail: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const usuarioMock = {
  id: 'uuid-123',
  email: 'admin@oficina.com',
  senhaHash: '$2b$10$hashedpassword',
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_USER_REPOSITORY, useValue: mockAuthUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('deve lançar UnauthorizedException quando o email não existe', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(null);

    const promessa = service.login('naoexiste@email.com', 'senha123');

    await expect(promessa).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promessa).rejects.toThrow(CREDENCIAIS_INVALIDAS_MSG);
    expect(mockAuthUserRepository.findByEmail).toHaveBeenCalledWith(
      'naoexiste@email.com',
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedException quando a senha está errada', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const promessa = service.login('admin@oficina.com', 'senhaerrada');

    await expect(promessa).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(promessa).rejects.toThrow(CREDENCIAIS_INVALIDAS_MSG);
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'senhaerrada',
      usuarioMock.senhaHash,
    );
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('deve retornar accessToken quando email e senha são válidos', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.signAsync.mockResolvedValue('token-jwt-fake');

    const result = await service.login('admin@oficina.com', 'senha123');

    expect(result).toEqual({ accessToken: 'token-jwt-fake' });
    expect(mockAuthUserRepository.findByEmail).toHaveBeenCalledWith(
      'admin@oficina.com',
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'senha123',
      usuarioMock.senhaHash,
    );
    expect(mockJwtService.signAsync).toHaveBeenCalledWith({
      sub: usuarioMock.id,
      email: usuarioMock.email,
    });
  });

  it('deve usar a mesma mensagem de erro para usuário inexistente e senha errada', async () => {
    mockAuthUserRepository.findByEmail.mockResolvedValue(null);
    let erroUsuarioInexistente: UnauthorizedException | undefined;
    try {
      await service.login('naoexiste@email.com', 'senha123');
    } catch (e) {
      erroUsuarioInexistente = e as UnauthorizedException;
    }

    mockAuthUserRepository.findByEmail.mockResolvedValue(usuarioMock);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    let erroSenhaErrada: UnauthorizedException | undefined;
    try {
      await service.login('admin@oficina.com', 'senhaerrada');
    } catch (e) {
      erroSenhaErrada = e as UnauthorizedException;
    }

    expect(erroUsuarioInexistente?.message).toBe(erroSenhaErrada?.message);
  });
});
