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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards';
import { UserService } from '../../application/use-case/user.service.js';
import {
  UserUpdateDto,
  UsuarioCreateDto,
} from '../../application/dto/user.dto.js';

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso' })
  async getUser() {
    return await this.userService.getAllUser();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso (senha gerada automaticamente)' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async createUser(@Body() dto: UsuarioCreateDto) {
    const user = await this.userService.createUser(dto);
    return user;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async updateUser(@Param('id') id: string, @Body() dto: UserUpdateDto) {
    const user = await this.userService.updateUser(id, dto);

    return user;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async deleteUser(@Param('id') id: string) {
    const user = await this.userService.deleteUser(id);

    return user;
  }
}
