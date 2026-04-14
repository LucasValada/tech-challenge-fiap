import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserUpdateDto, UsuarioCreateDto } from './dto/user.dto.js';
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUser() {
    return await this.userService.getAllUser();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: UsuarioCreateDto) {
    const user = await this.userService.createUser(dto);
    return user;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Param('id') id: string, @Body() dto: UserUpdateDto) {
    const user = await this.userService.updateUser(id, dto);

    return user;
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    const user = await this.userService.deleteUser(id);

    return user;
  }
}
