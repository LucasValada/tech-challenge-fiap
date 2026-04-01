import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserRepository } from './user.repository.js';

@Controller('user')
export class UserController {
  @Get()
  async getUser() {
    const service = new UserService(new UserRepository());
    return await service.getAllUser();
  }
}
