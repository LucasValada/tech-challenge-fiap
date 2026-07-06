import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateUserUseCase } from './update-user.use-case';

const USER_ID_EXISTENTE = 'uuid-existente';
const USER_ID_INEXISTENTE = 'uuid-inexistente';
const EMAIL_NORMALIZADO = 'usuario.teste@example.com';
const EMAIL_MIXED_CASE = 'Usuario.Teste@Example.com';
const NOME_NOVO = 'Atualizado';

const mockUserRepository = {
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  updateUser: jest.fn(),
};

const usuarioBase = {
  id: USER_ID_EXISTENTE,
  nome: 'Admin Teste',
  email: EMAIL_NORMALIZADO,
  senhaHash: 'fake-hash-for-tests',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
        { provide: 'USER_REPOSITORY', useValue: mockUserRepository },
      ],
    }).compile();

    useCase = moduleRef.get(UpdateUserUseCase);
    jest.clearAllMocks();
  });

  it('atualiza usuário existente e normaliza email', async () => {
    mockUserRepository.getUserByEmail.mockResolvedValue(null);
    mockUserRepository.getUserById.mockResolvedValue(usuarioBase);
    const atualizado = { ...usuarioBase, nome: NOME_NOVO };
    mockUserRepository.updateUser.mockResolvedValue(atualizado);

    const result = await useCase.execute(USER_ID_EXISTENTE, {
      email: EMAIL_MIXED_CASE,
      nome: NOME_NOVO,
    });

    expect(result).toBe(atualizado);
    expect(mockUserRepository.getUserByEmail).toHaveBeenCalledWith(
      EMAIL_NORMALIZADO,
      USER_ID_EXISTENTE,
    );
    expect(mockUserRepository.updateUser).toHaveBeenCalledWith(
      USER_ID_EXISTENTE,
      { email: EMAIL_NORMALIZADO, nome: NOME_NOVO },
    );
  });

  it('lança NotFoundException quando o usuário não existe', async () => {
    mockUserRepository.getUserByEmail.mockResolvedValue(null);
    mockUserRepository.getUserById.mockResolvedValue(null);

    await expect(
      useCase.execute(USER_ID_INEXISTENTE, {
        email: EMAIL_NORMALIZADO,
        nome: 'X',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança ConflictException quando email pertence a outro usuário', async () => {
    mockUserRepository.getUserByEmail.mockResolvedValue({
      ...usuarioBase,
      id: 'outro-uuid',
    });

    await expect(
      useCase.execute(USER_ID_EXISTENTE, {
        email: EMAIL_NORMALIZADO,
        nome: NOME_NOVO,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
  });
});
