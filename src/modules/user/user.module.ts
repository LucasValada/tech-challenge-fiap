import { Module } from '@nestjs/common';
import { GetAllUsersUseCase } from './application/use-case/get-all-users.use-case';
import { GetUserByIdUseCase } from './application/use-case/get-user-by-id.use-case';
import { CreateUserUseCase } from './application/use-case/create-user.use-case';
import { UpdateUserUseCase } from './application/use-case/update-user.use-case';
import { DeleteUserUseCase } from './application/use-case/delete-user.use-case';
import { UserController } from './interface/controller/user.controller';
import { PrismaUserRepository } from '../../infra/database/prisma/repositories/prisma.user.repository';
import { BcryptPasswordHasher } from './infra/bcrypt-password-hasher';

@Module({
  controllers: [UserController],
  providers: [
    GetAllUsersUseCase,
    GetUserByIdUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    { provide: 'USER_REPOSITORY', useClass: PrismaUserRepository },
    { provide: 'PASSWORD_HASHER', useClass: BcryptPasswordHasher },
  ],
})
export class UserModule {}
