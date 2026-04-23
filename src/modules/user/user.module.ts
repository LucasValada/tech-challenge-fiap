import { Module } from '@nestjs/common';
import { UserService } from './application/use-case/user.service.js';
import { UserController } from './interface/controller/user.controller.js';
import { generateRandomPassword } from './domain/services/generateRandomPassword.js';
import { PrismaUserRepository } from '../../infra/database/prisma/repositories/prisma.user.repository.js';

//instancia do module para só importar em app / main
@Module({
  controllers: [UserController],
  providers: [
    UserService,
    { provide: 'USER_REPOSITORY', useClass: PrismaUserRepository },
    { provide: 'GENERATE_PASSWORD', useValue: generateRandomPassword },
  ],
})
export class UserModule {}
