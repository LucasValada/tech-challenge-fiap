import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { UserRepository } from './user.repository.js';

//instancia do module para só importar em app / main
@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
