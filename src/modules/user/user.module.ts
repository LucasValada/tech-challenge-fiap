import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { generateRandomPassword } from './utils/generateRandomPassword.js';
import { PrismaUserRepository } from '../../infra/database/prisma/repositories/prisma.user.repository.js';

//instancia do module para só importar em app / main
@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    UserService,
    { provide: 'USER_REPOSITORY', useClass: PrismaUserRepository },
    { provide: 'GENERATE_PASSWORD', useValue: generateRandomPassword },
  ],
})
export class UserModule {}
