import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { generateRandomPassword } from './utils/generateRandomPassword';
import { PrismaUserRepository } from '../../infra/database/prisma/repositories/prisma.user.repository';

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
