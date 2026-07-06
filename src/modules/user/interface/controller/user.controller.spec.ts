import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { GetAllUsersUseCase } from '../../application/use-case/get-all-users.use-case';
import { GetUserByIdUseCase } from '../../application/use-case/get-user-by-id.use-case';
import { CreateUserUseCase } from '../../application/use-case/create-user.use-case';
import { UpdateUserUseCase } from '../../application/use-case/update-user.use-case';
import { DeleteUserUseCase } from '../../application/use-case/delete-user.use-case';

const USER_ID = 'uuid-1';
const VALID_EMAIL = 'usuario.teste@example.com';
const NOME = 'Admin Teste';

const mockGetAllUsers = { execute: jest.fn() };
const mockGetUserById = { execute: jest.fn() };
const mockCreateUser = { execute: jest.fn() };
const mockUpdateUser = { execute: jest.fn() };
const mockDeleteUser = { execute: jest.fn() };

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: GetAllUsersUseCase, useValue: mockGetAllUsers },
        { provide: GetUserByIdUseCase, useValue: mockGetUserById },
        { provide: CreateUserUseCase, useValue: mockCreateUser },
        { provide: UpdateUserUseCase, useValue: mockUpdateUser },
        { provide: DeleteUserUseCase, useValue: mockDeleteUser },
      ],
    }).compile();

    controller = moduleRef.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('GET / delega para GetAllUsersUseCase', async () => {
    const lista = { user: [], count: 0 };
    mockGetAllUsers.execute.mockResolvedValue(lista);

    const result = await controller.getUser();

    expect(result).toBe(lista);
    expect(mockGetAllUsers.execute).toHaveBeenCalled();
  });

  it('GET /:id delega para GetUserByIdUseCase com o id', async () => {
    const usuario = { id: USER_ID };
    mockGetUserById.execute.mockResolvedValue(usuario);

    const result = await controller.getUserById(USER_ID);

    expect(result).toBe(usuario);
    expect(mockGetUserById.execute).toHaveBeenCalledWith(USER_ID);
  });

  it('POST / delega para CreateUserUseCase com o DTO', async () => {
    const dto = { email: VALID_EMAIL, nome: NOME };
    const criado = { id: USER_ID };
    mockCreateUser.execute.mockResolvedValue(criado);

    const result = await controller.createUser(dto);

    expect(result).toBe(criado);
    expect(mockCreateUser.execute).toHaveBeenCalledWith(dto);
  });

  it('PUT /:id delega para UpdateUserUseCase com id e DTO', async () => {
    const dto = { email: VALID_EMAIL, nome: NOME };
    const atualizado = { id: USER_ID };
    mockUpdateUser.execute.mockResolvedValue(atualizado);

    const result = await controller.updateUser(USER_ID, dto);

    expect(result).toBe(atualizado);
    expect(mockUpdateUser.execute).toHaveBeenCalledWith(USER_ID, dto);
  });

  it('DELETE /:id delega para DeleteUserUseCase com o id', async () => {
    const deletado = { id: USER_ID };
    mockDeleteUser.execute.mockResolvedValue(deletado);

    const result = await controller.deleteUser(USER_ID);

    expect(result).toBe(deletado);
    expect(mockDeleteUser.execute).toHaveBeenCalledWith(USER_ID);
  });
});
