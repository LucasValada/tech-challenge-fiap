import { NotFoundException } from '@nestjs/common';
import { buscarUsuarioOuFalhar } from './buscarUsuarioOuFalhar';

const USER_ID = 'user-uuid-1';

const usuarioMock = {
  id: USER_ID,
  nome: 'Admin',
  email: 'admin@teste.com',
  senhaHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('buscarUsuarioOuFalhar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna o usuário quando encontrado', async () => {
    mockRepo.findById.mockResolvedValue(usuarioMock);

    const result = await buscarUsuarioOuFalhar(mockRepo, USER_ID);

    expect(result).toBe(usuarioMock);
    expect(mockRepo.findById).toHaveBeenCalledWith(USER_ID);
  });

  it('lança NotFoundException quando o usuário não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      buscarUsuarioOuFalhar(mockRepo, 'inexistente'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
