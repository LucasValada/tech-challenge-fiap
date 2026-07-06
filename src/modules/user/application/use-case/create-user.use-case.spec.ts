import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.use-case';

const EMAIL_NOVO_MIXED = 'Novo@Example.com';
const EMAIL_NOVO_NORMALIZADO = 'novo@example.com';
const EMAIL_EXISTENTE = 'existente@example.com';
const NOME = 'Novo Usuário';
const FAKE_HASH = 'fake-hash-for-tests';
const SENHA_GERADA_LENGTH = 8;

const mockUserRepository = {
  getUserByEmail: jest.fn(),
  createUser: jest.fn(),
};

const mockPasswordHasher = {
  hash: jest.fn(),
};

const usuarioBase = {
  id: 'uuid-novo',
  nome: NOME,
  email: EMAIL_NOVO_NORMALIZADO,
  senhaHash: FAKE_HASH,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: 'USER_REPOSITORY', useValue: mockUserRepository },
        { provide: 'PASSWORD_HASHER', useValue: mockPasswordHasher },
      ],
    }).compile();

    useCase = moduleRef.get(CreateUserUseCase);
    jest.clearAllMocks();
  });

  it('cria usuário, normaliza email e retorna a senha gerada em texto plano', async () => {
    mockUserRepository.getUserByEmail.mockResolvedValue(null);
    mockUserRepository.createUser.mockResolvedValue({ ...usuarioBase });
    mockPasswordHasher.hash.mockResolvedValue(FAKE_HASH);

    const result = await useCase.execute({
      email: EMAIL_NOVO_MIXED,
      nome: NOME,
    });

    expect(mockUserRepository.getUserByEmail).toHaveBeenCalledWith(
      EMAIL_NOVO_NORMALIZADO,
      undefined,
    );
    expect(mockPasswordHasher.hash).toHaveBeenCalledTimes(1);
    expect(mockUserRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: EMAIL_NOVO_NORMALIZADO,
        nome: NOME,
        senhaHash: FAKE_HASH,
      }),
    );

    expect(result.senhaHash).not.toBe(FAKE_HASH);
    expect(result.senhaHash).toHaveLength(SENHA_GERADA_LENGTH);
  });

  it('lança ConflictException quando email já existe', async () => {
    mockUserRepository.getUserByEmail.mockResolvedValue(usuarioBase);

    await expect(
      useCase.execute({ email: EMAIL_EXISTENTE, nome: 'Outro' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
  });
});
