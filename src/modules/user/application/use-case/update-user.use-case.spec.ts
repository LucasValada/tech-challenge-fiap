import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateUserUseCase } from './update-user.use-case';

const USER_ID = 'user-uuid';
const EMAIL_ATUAL = 'atual@teste.com';
const EMAIL_NOVO = 'novo@teste.com';

const usuarioMock = {
  id: USER_ID,
  nome: 'Admin',
  email: EMAIL_ATUAL,
  senhaHash: '$2a$10$secret',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
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

  it('atualiza só o nome sem validar email quando ele não vem no payload', async () => {
    mockUserRepository.findById.mockResolvedValue(usuarioMock);
    mockUserRepository.update.mockResolvedValue({
      ...usuarioMock,
      nome: 'Novo Nome',
    });

    const result = await useCase.execute(USER_ID, { nome: 'Novo Nome' });

    expect(result).not.toHaveProperty('senhaHash');
    expect(result.nome).toBe('Novo Nome');
    expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    expect(mockUserRepository.update).toHaveBeenCalledWith(USER_ID, {
      nome: 'Novo Nome',
    });
  });

  it('normaliza email e valida unicidade excluindo o próprio id', async () => {
    mockUserRepository.findById.mockResolvedValue(usuarioMock);
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.update.mockResolvedValue({
      ...usuarioMock,
      email: EMAIL_NOVO,
    });

    await useCase.execute(USER_ID, { email: 'Novo@Teste.COM' });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      EMAIL_NOVO,
      USER_ID,
    );
    expect(mockUserRepository.update).toHaveBeenCalledWith(USER_ID, {
      email: EMAIL_NOVO,
    });
  });

  it('lança NotFoundException quando o usuário não existe', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { nome: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('lança ConflictException quando o email pertence a outro usuário', async () => {
    mockUserRepository.findById.mockResolvedValue(usuarioMock);
    mockUserRepository.findByEmail.mockResolvedValue({
      ...usuarioMock,
      id: 'outro-uuid',
    });

    await expect(
      useCase.execute(USER_ID, { email: EMAIL_NOVO }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });
});
