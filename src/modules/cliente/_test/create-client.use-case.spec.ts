import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

jest.mock('bcrypt');

const mockAuthRepository = {
  findClientByCpfCnpj: jest.fn(),
};

const mockJwtService = {
  createAsync: jest.fn(),
};

const clientMock = {
  nome: 'John Doe',
  telefone: '(11)937379050',
  email: 'example@email.com',
  cpfCnpj: '123.456.789-00',
  tipoPessoa: 'FISICA',
  id: '69740fb2-8631-4aad-9bce-07d2a42018f1',
  createdAt: '2026-04-21T21:32:45.524Z',
  updatedAt: '2026-04-21T21:32:45.524Z',
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('deve lançar UnauthorizedException quando o email não existe', async () => {
    mockAuthRepository.findClientByCpfCnpj.mockResolvedValue(null);

    await expect(
      service.login('naoexiste@email.com', 'senha123'),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockAuthRepository.findClientByCpfCnpj).toHaveBeenCalledWith(
      '999.999.999-00',
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedException quando a senha está errada', async () => {
    mockAuthRepository.findUsuarioByEmail.mockResolvedValue(usuarioMock);
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
    mockAuthRepository.findUsuarioByEmail.mockResolvedValue(usuarioMock);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.signAsync.mockResolvedValue('token-jwt-fake');

    const result = await service.login('admin@oficina.com', 'senha123');

    expect(result).toEqual({ accessToken: 'token-jwt-fake' });
    expect(mockAuthRepository.findUsuarioByEmail).toHaveBeenCalledWith(
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
    mockAuthRepository.findUsuarioByEmail.mockResolvedValue(null);
    let erroUsuarioInexistente: UnauthorizedException | undefined;
    try {
      await service.login('naoexiste@email.com', 'senha123');
    } catch (e) {
      erroUsuarioInexistente = e as UnauthorizedException;
    }

    mockAuthRepository.findUsuarioByEmail.mockResolvedValue(usuarioMock);
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
