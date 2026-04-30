import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { USER_REPOSITORY } from '../../domain/repository/user.repository';

const mockUserRepo = {
  getAllUser: jest.fn(),
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
};

const usuarioBase = {
  id: 'uuid-1',
  nome: 'Admin',
  email: 'admin@email.com',
  senhaHash: '$2b$10$hashedvalue',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
      ],
    }).compile();

    service = moduleRef.get(UserService);
    jest.clearAllMocks();
  });

  describe('getAllUser', () => {
    it('retorna lista de usuários', async () => {
      const resultado = { user: [usuarioBase], count: 1 };
      mockUserRepo.getAllUser.mockResolvedValue(resultado);

      const result = await service.getAllUser();

      expect(result).toBe(resultado);
    });
  });

  describe('getUserById', () => {
    it('retorna usuário quando encontrado', async () => {
      mockUserRepo.getUserById.mockResolvedValue(usuarioBase);

      const result = await service.getUserById('uuid-1');

      expect(result).toBe(usuarioBase);
    });

    it('lança NotFoundException quando não encontrado', async () => {
      mockUserRepo.getUserById.mockResolvedValue(null);

      await expect(service.getUserById('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createUser', () => {
    it('cria usuário e retorna senha em texto plano', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(null);
      mockUserRepo.createUser.mockResolvedValue({ ...usuarioBase });

      const result = await service.createUser({
        email: 'Novo@Email.com',
        nome: 'Novo',
      });

      expect(mockUserRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'novo@email.com',
          nome: 'Novo',
          senhaHash: expect.any(String),
        }),
      );
      // senhaHash é substituído pela senha em texto plano
      expect(result.senhaHash).not.toBe(usuarioBase.senhaHash);
      expect(result.senhaHash).toHaveLength(8);
    });

    it('lança ConflictException quando email já existe', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(usuarioBase);

      await expect(
        service.createUser({ email: 'admin@email.com', nome: 'Outro' }),
      ).rejects.toThrow(ConflictException);
      expect(mockUserRepo.createUser).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('atualiza usuário existente', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(null);
      mockUserRepo.getUserById.mockResolvedValue(usuarioBase);
      const atualizado = { ...usuarioBase, nome: 'Atualizado' };
      mockUserRepo.updateUser.mockResolvedValue(atualizado);

      const result = await service.updateUser('uuid-1', {
        email: 'Admin@Email.com',
        nome: 'Atualizado',
      });

      expect(result.nome).toBe('Atualizado');
      expect(mockUserRepo.updateUser).toHaveBeenCalledWith('uuid-1', {
        email: 'admin@email.com',
        nome: 'Atualizado',
      });
    });

    it('lança NotFoundException quando usuário não existe', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(null);
      mockUserRepo.getUserById.mockResolvedValue(null);

      await expect(
        service.updateUser('inexistente', {
          email: 'x@email.com',
          nome: 'X',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança ConflictException quando email pertence a outro', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue({
        ...usuarioBase,
        id: 'outro-uuid',
      });

      await expect(
        service.updateUser('uuid-1', {
          email: 'admin@email.com',
          nome: 'X',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteUser', () => {
    it('deleta usuário existente', async () => {
      mockUserRepo.getUserById.mockResolvedValue(usuarioBase);
      mockUserRepo.deleteUser.mockResolvedValue(usuarioBase);

      const result = await service.deleteUser('uuid-1');

      expect(result).toBe(usuarioBase);
      expect(mockUserRepo.deleteUser).toHaveBeenCalledWith('uuid-1');
    });

    it('lança NotFoundException quando não existe', async () => {
      mockUserRepo.getUserById.mockResolvedValue(null);

      await expect(service.deleteUser('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserByEmail', () => {
    it('retorna usuário pelo email', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(usuarioBase);

      const result = await service.getUserByEmail('admin@email.com');

      expect(result).toBe(usuarioBase);
    });

    it('retorna null quando não encontrado', async () => {
      mockUserRepo.getUserByEmail.mockResolvedValue(null);

      const result = await service.getUserByEmail('x@email.com');

      expect(result).toBeNull();
    });
  });
});
