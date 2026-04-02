import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service.js';
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async getUser() {
    return await this.userService.getAllUser();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }
}
