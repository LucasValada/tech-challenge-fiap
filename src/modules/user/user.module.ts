import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { UserRepository } from './user.repository.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { generateRandomPassword } from './utils/generateRandomPassword.js';
// import { MailService } from '../../core/mail.service.js';

//instancia do module para só importar em app / main
@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    UserService,
    // MailService,
    UserRepository,
    { provide: 'GENERATE_PASSWORD', useValue: generateRandomPassword },
  ],
})
export class UserModule {}
