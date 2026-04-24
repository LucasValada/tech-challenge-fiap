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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards';
import { UserService } from '../../application/use-case/user.service.js';
import {
  UserUpdateDto,
  UsuarioCreateDto,
} from '../../application/dto/user.dto.js';

@UseGuards(JwtAuthGuard)
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

  @Post('/')
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
