import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/application/use-case/user.service';

jest.mock('bcrypt');

const mockUserService = {
  getUserByEmail: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const usuarioMock = {
  id: 'uuid-123',
  nome: 'Admin',
  email: 'admin@oficina.com',
  senhaHash: '$2b$10$hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('deve lançar UnauthorizedException quando o email não existe', async () => {
    mockUserService.getUserByEmail.mockResolvedValue(null);

    await expect(
      service.login('naoexiste@email.com', 'senha123'),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
      'naoexiste@email.com',
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedException quando a senha está errada', async () => {
    mockUserService.getUserByEmail.mockResolvedValue(usuarioMock);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login('admin@oficina.com', 'senhaerrada'),
    ).rejects.toThrow(UnauthorizedException);
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'senhaerrada',
      usuarioMock.senhaHash,
    );
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('deve retornar accessToken quando email e senha são válidos', async () => {
    mockUserService.getUserByEmail.mockResolvedValue(usuarioMock);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.signAsync.mockResolvedValue('token-jwt-fake');

    const result = await service.login('admin@oficina.com', 'senha123');

    expect(result).toEqual({ accessToken: 'token-jwt-fake' });
    expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(
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
    mockUserService.getUserByEmail.mockResolvedValue(null);
    let erroUsuarioInexistente: UnauthorizedException | undefined;
    try {
      await service.login('naoexiste@email.com', 'senha123');
    } catch (e) {
      erroUsuarioInexistente = e as UnauthorizedException;
    }

    mockUserService.getUserByEmail.mockResolvedValue(usuarioMock);
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
