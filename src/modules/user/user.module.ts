import { Module } from '@nestjs/common';
import { UserService } from './application/use-case/user.service';
import { UserController } from './interface/controller/user.controller';
import { USER_REPOSITORY } from './domain/repository/user.repository';
import { PrismaUserRepository } from '../../infra/database/prisma/repositories/prisma.user.repository';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class UserModule {}
